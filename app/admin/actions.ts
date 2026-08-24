"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { operationFailureCode, operationFailureUrl } from "@/lib/operation-feedback";
import { createSettlementPeriod, OPERATIONAL_RPC_TIMEOUT_MS, reviewOfferRevision, verifyAndActivateSubject, withOperationalTimeout } from "@/lib/operations.server";
import { normalizedOfferFormData, priceInputsToMinor } from "@/lib/money-input";
import { priceScopeFromFormData, priceScopeItemsFromFormData, priceScopeNotesFromFormData, priceScopeVisitCountFromFormData, type PriceScope } from "@/lib/price-scope";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionPatientBookingAccount } from "@/lib/account-auth.server";
import { ACTIVE_TREATMENT_CATALOG_TAG } from "@/lib/treatment-catalog.server";
import type { Json } from "@/lib/database.types";
import { adminOfferUpdateSchema, adminSlotUpdateSchema, clinicOperatorAccountIdSchema, featureFlagUpdateSchema, normalizeQatarDateTime, notificationTemplateSchema, operationalClientAccountSchema, patientBookingRegistrationSchema, settlementPeriodSchema, supportKnowledgeArticleSchema, treatmentCatalogSchema, treatmentCatalogUpdateSchema, treatmentVariantSchema, treatmentVariantUpdateSchema, uuid, verificationSchema } from "@/lib/validation";

async function requireAdmin() {
  const supabase = await createClient();
  const { data, error } = await withOperationalTimeout(supabase.auth.getClaims());
  const meta = (data?.claims?.app_metadata ?? {}) as Record<string, unknown>;
  if (error || !data?.claims?.sub || meta.platform_admin !== true) redirect("/");
  return supabase;
}

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data, error } = await withOperationalTimeout(supabase.auth.getClaims());
  const meta = (data?.claims?.app_metadata ?? {}) as Record<string, unknown>;
  const actorId = data?.claims?.sub;
  if (error || !actorId || meta.platform_admin !== true || meta.platform_super_admin !== true) redirect("/");
  return actorId;
}

function validationFailure(action: string): never {
  console.warn("Admin operation rejected", { action, code: "VALIDATION_FAILED" });
  redirect(operationFailureUrl("admin", action, "invalid"));
}

function adminActionFailure(action: string, error: unknown): never {
  const internalCode = error instanceof Error && error.message ? error.message : "OPERATION_FAILED";
  console.error("Admin operation failed", { action, code: internalCode });
  redirect(operationFailureUrl("admin", action, operationFailureCode(error)));
}

function requireReturnedRow<T>(data: T | null, error: { code?: string } | null): T {
  if (error) throw new Error(error.code || "OPERATION_FAILED");
  if (!data) throw new Error("FORBIDDEN");
  return data;
}

export async function verifyAndActivate(formData: FormData): Promise<void> {
  const parsed = verificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("verifyAndActivate");
  await requireAdmin();
  try {
    await verifyAndActivateSubject({ subjectType: parsed.data.subject_type, subjectId: parsed.data.subject_id, source: parsed.data.source, identifier: parsed.data.identifier || undefined });
    revalidatePath("/admin");
    revalidatePath("/clinic");
  } catch (error) {
    adminActionFailure("verifyAndActivate", error);
  }
}

function parseJsonObject(value: string): Json {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_JSON_OBJECT");
    return parsed as Json;
  } catch {
    throw new Error("INVALID_JSON_OBJECT");
  }
}

function revalidateDisplaySurfaces() {
  revalidatePath("/");
  revalidatePath("/results");
  revalidatePath("/account");
  revalidatePath("/clinic");
  revalidatePath("/admin");
}

function revalidateTreatmentCatalogSurfaces() {
  updateTag(ACTIVE_TREATMENT_CATALOG_TAG);
  revalidateDisplaySurfaces();
}

export async function updateFeatureFlag(formData: FormData): Promise<void> {
  const parsed = featureFlagUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("updateFeatureFlag");
  const supabase = await requireAdmin();
  try {
    const config = parseJsonObject(parsed.data.config_json);
    const result = await withOperationalTimeout(supabase.from("feature_flags").update({ enabled: parsed.data.enabled, config, updated_at: new Date().toISOString() }).eq("key", parsed.data.key).select("key").maybeSingle());
    requireReturnedRow(result.data, result.error);
    revalidateDisplaySurfaces();
  } catch (error) {
    adminActionFailure("updateFeatureFlag", error);
  }
}

export async function createTreatmentCatalog(formData: FormData): Promise<void> {
  const parsed = treatmentCatalogSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("createTreatmentCatalog");
  const supabase = await requireAdmin();
  try {
    const result = await withOperationalTimeout(supabase.from("treatment_catalog").insert(parsed.data).select("id").single());
    requireReturnedRow(result.data, result.error);
    revalidateTreatmentCatalogSurfaces();
  } catch (error) {
    adminActionFailure("createTreatmentCatalog", error);
  }
}

export async function updateTreatmentCatalog(formData: FormData): Promise<void> {
  const parsed = treatmentCatalogUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("updateTreatmentCatalog");
  const supabase = await requireAdmin();
  try {
    const { id, ...changes } = parsed.data;
    const result = await withOperationalTimeout(supabase.from("treatment_catalog").update(changes).eq("id", id).select("id").maybeSingle());
    requireReturnedRow(result.data, result.error);
    revalidateTreatmentCatalogSurfaces();
  } catch (error) {
    adminActionFailure("updateTreatmentCatalog", error);
  }
}

export async function createTreatmentVariant(formData: FormData): Promise<void> {
  const parsed = treatmentVariantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("createTreatmentVariant");
  const supabase = await requireAdmin();
  try {
    const { attributes_json: attributesJson, ...values } = parsed.data;
    const attributes = parseJsonObject(attributesJson);
    const result = await withOperationalTimeout(supabase.from("treatment_variants").insert({ ...values, attributes }).select("id").single());
    requireReturnedRow(result.data, result.error);
    revalidateTreatmentCatalogSurfaces();
  } catch (error) {
    adminActionFailure("createTreatmentVariant", error);
  }
}

export async function updateTreatmentVariant(formData: FormData): Promise<void> {
  const parsed = treatmentVariantUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("updateTreatmentVariant");
  const supabase = await requireAdmin();
  try {
    const attributes = parseJsonObject(parsed.data.attributes_json);
    const { id } = parsed.data;
    const changes = {
      catalog_id: parsed.data.catalog_id,
      variant_key: parsed.data.variant_key,
      name_ar: parsed.data.name_ar,
      name_en: parsed.data.name_en,
      active: parsed.data.active,
      attributes,
    };
    const result = await withOperationalTimeout(supabase.from("treatment_variants").update(changes).eq("id", id).select("id").maybeSingle());
    requireReturnedRow(result.data, result.error);
    revalidateTreatmentCatalogSurfaces();
  } catch (error) {
    adminActionFailure("updateTreatmentVariant", error);
  }
}

export async function updateAdminOffer(formData: FormData): Promise<void> {
  const parsed = adminOfferUpdateSchema.safeParse(normalizedOfferFormData(formData));
  if (!parsed.success) validationFailure("updateAdminOffer");
  let scope: PriceScope;
  let includedItems: string[];
  let excludedItems: string[];
  let visitCount: number | null;
  let followUpTerms: string | null;
  let notes: string | null;
  try {
    scope = priceScopeFromFormData(formData);
    includedItems = priceScopeItemsFromFormData(formData, "included_items");
    excludedItems = priceScopeItemsFromFormData(formData, "excluded_items");
    visitCount = priceScopeVisitCountFromFormData(formData);
    followUpTerms = priceScopeNotesFromFormData(formData, "follow_up_terms");
    notes = priceScopeNotesFromFormData(formData, "notes");
  } catch {
    validationFailure("updateAdminOffer");
  }
  const supabase = await requireAdmin();
  try {
    const money = priceInputsToMinor(parsed.data.price_type, formData.get("min_qar"), formData.get("max_qar"));
    const { data: claims } = await withOperationalTimeout(supabase.auth.getClaims());
    const actorId = claims?.claims?.sub;
    if (typeof actorId !== "string") throw new Error("AUTH_REQUIRED");
    const result = await withOperationalTimeout(supabase.from("branch_service_offers").update({
      price_type: parsed.data.price_type,
      min_minor: money.minMinor,
      max_minor: money.maxMinor,
      duration_minutes: parsed.data.duration_minutes,
      status: parsed.data.status,
      price_scope: scope,
      included_items: includedItems,
      excluded_items: excludedItems,
      visit_count: visitCount,
      follow_up_terms: followUpTerms,
      notes,
      last_verified_at: new Date().toISOString(),
      verified_by: actorId,
    }).eq("id", parsed.data.id).select("id").maybeSingle());
    requireReturnedRow(result.data, result.error);
    revalidateDisplaySurfaces();
  } catch (error) {
    adminActionFailure("updateAdminOffer", error);
  }
}

export async function updateAdminSlot(formData: FormData): Promise<void> {
  const parsed = adminSlotUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("updateAdminSlot");
  const supabase = await requireAdmin();
  try {
    const result = await withOperationalTimeout(supabase.from("availability_slots").update({
      start_at: normalizeQatarDateTime(parsed.data.start_at),
      end_at: normalizeQatarDateTime(parsed.data.end_at),
      status: parsed.data.status,
      freshness_at: new Date().toISOString(),
    }).eq("id", parsed.data.id).select("id").maybeSingle());
    requireReturnedRow(result.data, result.error);
    revalidateDisplaySurfaces();
  } catch (error) {
    adminActionFailure("updateAdminSlot", error);
  }
}

export async function moderateReview(formData: FormData): Promise<void> {
  const parsed = z.object({ id: uuid, status: z.enum(["published", "hidden", "removed"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("moderateReview");
  const supabase = await requireAdmin();
  try {
    const result = await withOperationalTimeout(supabase.from("reviews").update({ status: parsed.data.status }).eq("id", parsed.data.id).select("id").maybeSingle());
    requireReturnedRow(result.data, result.error);
    revalidatePath("/admin");
  } catch (error) {
    adminActionFailure("moderateReview", error);
  }
}

export async function reviewPriceRevision(formData: FormData): Promise<void> {
  const parsed = z.object({ revision_id: uuid, decision: z.enum(["approve", "reject"]), reason: z.string().trim().max(500).optional().default("") }).superRefine((value, ctx) => {
    if (value.decision === "reject" && value.reason.length < 3) ctx.addIssue({ code: "custom", path: ["reason"], message: "REJECTION_REASON_REQUIRED" });
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("reviewPriceRevision");
  await requireAdmin();
  try {
    await reviewOfferRevision({ revisionId: parsed.data.revision_id, approve: parsed.data.decision === "approve", reason: parsed.data.reason || undefined });
    revalidatePath("/admin");
    revalidatePath("/clinic");
    revalidatePath("/results");
  } catch (error) {
    adminActionFailure("reviewPriceRevision", error);
  }
}

export async function createSupportKnowledgeArticle(formData: FormData): Promise<void> {
  const parsed = supportKnowledgeArticleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("createSupportKnowledgeArticle");
  const supabase = await requireAdmin();
  try {
    const { data: claims } = await withOperationalTimeout(supabase.auth.getClaims());
    const actorId = claims?.claims?.sub;
    if (typeof actorId !== "string") throw new Error("AUTH_REQUIRED");
    const result = await withOperationalTimeout(supabase.from("support_knowledge_articles").insert({ ...parsed.data, status: "draft", created_by: actorId }).select("id").single());
    requireReturnedRow(result.data, result.error);
    revalidatePath("/admin");
  } catch (error) {
    adminActionFailure("createSupportKnowledgeArticle", error);
  }
}

export async function approveSupportKnowledgeArticle(formData: FormData): Promise<void> {
  const parsed = z.object({ id: uuid }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("approveSupportKnowledgeArticle");
  const supabase = await requireAdmin();
  try {
    const { data: claims } = await withOperationalTimeout(supabase.auth.getClaims());
    const actorId = claims?.claims?.sub;
    if (typeof actorId !== "string") throw new Error("AUTH_REQUIRED");
    const result = await withOperationalTimeout(supabase.from("support_knowledge_articles").update({ status: "approved", approved_by: actorId, approved_at: new Date().toISOString() }).eq("id", parsed.data.id).eq("status", "draft").select("id").maybeSingle());
    requireReturnedRow(result.data, result.error);
    revalidatePath("/admin");
  } catch (error) {
    adminActionFailure("approveSupportKnowledgeArticle", error);
  }
}

export async function archiveSupportKnowledgeArticle(formData: FormData): Promise<void> {
  const parsed = z.object({ id: uuid }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("archiveSupportKnowledgeArticle");
  const supabase = await requireAdmin();
  try {
    const result = await withOperationalTimeout(supabase.from("support_knowledge_articles").update({ status: "archived" }).eq("id", parsed.data.id).neq("status", "archived").select("id").maybeSingle());
    requireReturnedRow(result.data, result.error);
    revalidatePath("/admin");
  } catch (error) {
    adminActionFailure("archiveSupportKnowledgeArticle", error);
  }
}

export async function createNotificationTemplate(formData: FormData): Promise<void> {
  const parsed = notificationTemplateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("createNotificationTemplate");
  const supabase = await requireAdmin();
  try {
    const { data: claims } = await withOperationalTimeout(supabase.auth.getClaims());
    const actorId = claims?.claims?.sub;
    if (typeof actorId !== "string") throw new Error("AUTH_REQUIRED");
    const result = await withOperationalTimeout(supabase.from("notification_templates").insert({ ...parsed.data, subject: parsed.data.subject || null, status: "draft", created_by: actorId }).select("id").single());
    requireReturnedRow(result.data, result.error);
    revalidatePath("/admin");
  } catch (error) {
    adminActionFailure("createNotificationTemplate", error);
  }
}

export async function activateNotificationTemplate(formData: FormData): Promise<void> {
  const parsed = z.object({ id: uuid }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("activateNotificationTemplate");
  const supabase = await requireAdmin();
  try {
    const result = await withOperationalTimeout(supabase.from("notification_templates").update({ status: "active" }).eq("id", parsed.data.id).eq("status", "draft").select("id").maybeSingle());
    requireReturnedRow(result.data, result.error);
    revalidatePath("/admin");
  } catch (error) {
    adminActionFailure("activateNotificationTemplate", error);
  }
}

export async function createSettlement(formData: FormData): Promise<void> {
  const parsed = settlementPeriodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("createSettlement");
  await requireAdmin();
  try {
    await createSettlementPeriod({ clinicId: parsed.data.clinic_id, periodStart: parsed.data.period_start, periodEnd: parsed.data.period_end, periodKind: parsed.data.period_kind, notes: parsed.data.notes || undefined });
    revalidatePath("/admin");
  } catch (error) {
    adminActionFailure("createSettlement", error);
  }
}

export async function createPatientAccount(formData: FormData): Promise<void> {
  const parsed = patientBookingRegistrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("createPatientAccount");
  await requireSuperAdmin();

  const result = await provisionPatientBookingAccount(parsed.data);
  if (!result.ok) adminActionFailure("createPatientAccount", new Error(result.code.toUpperCase()));
  revalidatePath("/admin");
  revalidatePath("/account");
}

export async function createOperationalClientAccount(formData: FormData): Promise<void> {
  const parsed = operationalClientAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("createOperationalClientAccount");
  const actorId = await requireSuperAdmin();

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    adminActionFailure("createOperationalClientAccount", new Error("SERVICE_UNAVAILABLE"));
  }

  const { data: created, error: createError } = await withOperationalTimeout(admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    app_metadata: { access_scope: "clinic_bookings_only" },
    user_metadata: { account_kind: "clinic_operator", operational_client: true },
  })).catch(() => ({ data: { user: null }, error: { code: "OPERATION_TIMEOUT", message: "OPERATION_TIMEOUT" } }));
  if (createError || !created.user) {
    const detail = `${createError?.code ?? ""} ${createError?.message ?? ""}`.toLowerCase();
    adminActionFailure("createOperationalClientAccount", new Error(detail.includes("already") ? "ACCOUNT_EXISTS" : "OPERATION_FAILED"));
  }

  try {
    const { error } = await admin.rpc("provision_operational_client_account_server", {
      p_actor_id: actorId,
      p_clinic_id: parsed.data.clinic_id,
      p_branch_id: parsed.data.branch_id,
      p_user_id: created.user.id,
      p_username: parsed.data.username,
    }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS));
    if (error) throw new Error(error.code || "OPERATION_FAILED");
  } catch (error) {
    await withOperationalTimeout(admin.auth.admin.deleteUser(created.user.id)).catch(() => undefined);
    adminActionFailure("createOperationalClientAccount", error);
  }

  revalidatePath("/admin");
  revalidatePath("/clinic");
  revalidatePath("/clinic/bookings");
}

export async function revokeOperationalClientAccount(formData: FormData): Promise<void> {
  const parsed = clinicOperatorAccountIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("revokeOperationalClientAccount");
  const actorId = await requireSuperAdmin();

  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("revoke_operational_client_account_server", {
      p_actor_id: actorId,
      p_operator_account_id: parsed.data.operator_account_id,
    }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS));
    if (error) throw new Error(error.code || "OPERATION_FAILED");
  } catch (error) {
    adminActionFailure("revokeOperationalClientAccount", error);
  }

  revalidatePath("/admin");
  revalidatePath("/clinic/bookings");
}
