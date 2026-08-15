"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { operationFailureCode, operationFailureUrl } from "@/lib/operation-feedback";
import { createSettlementPeriod, reviewOfferRevision, verifyAndActivateSubject } from "@/lib/operations.server";
import { createClient } from "@/lib/supabase/server";
import { featureFlagSchema, notificationTemplateSchema, settlementPeriodSchema, supportKnowledgeArticleSchema, uuid, verificationSchema } from "@/lib/validation";

async function requireAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const meta = (data?.claims?.app_metadata ?? {}) as Record<string, unknown>;
  if (error || !data?.claims?.sub || meta.platform_admin !== true) redirect("/");
  return supabase;
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

export async function verifyAndActivate(formData: FormData): Promise<void> {
  const parsed = verificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("verifyAndActivate");
  await requireAdmin();
  try {
    await verifyAndActivateSubject({
      subjectType: parsed.data.subject_type,
      subjectId: parsed.data.subject_id,
      source: parsed.data.source,
      identifier: parsed.data.identifier || undefined,
    });
    revalidatePath("/admin");
    revalidatePath("/clinic");
  } catch (error) {
    adminActionFailure("verifyAndActivate", error);
  }
}

export async function updateFeatureFlag(formData: FormData): Promise<void> {
  const parsed = featureFlagSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("updateFeatureFlag");
  const supabase = await requireAdmin();
  try {
    const { error } = await supabase.from("feature_flags").update({ enabled: parsed.data.enabled, updated_at: new Date().toISOString() }).eq("key", parsed.data.key);
    if (error) throw new Error(error.code);
    revalidatePath("/admin");
  } catch (error) {
    adminActionFailure("updateFeatureFlag", error);
  }
}

export async function moderateReview(formData: FormData): Promise<void> {
  const parsed = z.object({ id: uuid, status: z.enum(["published", "hidden", "removed"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("moderateReview");
  const supabase = await requireAdmin();
  try {
    const { error } = await supabase.from("reviews").update({ status: parsed.data.status }).eq("id", parsed.data.id);
    if (error) throw new Error(error.code);
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
    const { data: claims } = await supabase.auth.getClaims();
    const actorId = claims?.claims?.sub;
    if (typeof actorId !== "string") throw new Error("AUTH_REQUIRED");
    const { error } = await supabase.from("support_knowledge_articles").insert({ ...parsed.data, status: "draft", created_by: actorId });
    if (error) throw new Error(error.code);
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
    const { data: claims } = await supabase.auth.getClaims();
    const actorId = claims?.claims?.sub;
    if (typeof actorId !== "string") throw new Error("AUTH_REQUIRED");
    const { error } = await supabase.from("support_knowledge_articles").update({ status: "approved", approved_by: actorId, approved_at: new Date().toISOString() }).eq("id", parsed.data.id);
    if (error) throw new Error(error.code);
    revalidatePath("/admin");
  } catch (error) {
    adminActionFailure("approveSupportKnowledgeArticle", error);
  }
}

export async function createNotificationTemplate(formData: FormData): Promise<void> {
  const parsed = notificationTemplateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("createNotificationTemplate");
  const supabase = await requireAdmin();
  try {
    const { data: claims } = await supabase.auth.getClaims();
    const actorId = claims?.claims?.sub;
    if (typeof actorId !== "string") throw new Error("AUTH_REQUIRED");
    const { error } = await supabase.from("notification_templates").insert({ ...parsed.data, subject: parsed.data.subject || null, status: "draft", created_by: actorId });
    if (error) throw new Error(error.code);
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
    const { error } = await supabase.from("notification_templates").update({ status: "active" }).eq("id", parsed.data.id);
    if (error) throw new Error(error.code);
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
    await createSettlementPeriod({
      clinicId: parsed.data.clinic_id,
      periodStart: parsed.data.period_start,
      periodEnd: parsed.data.period_end,
      periodKind: parsed.data.period_kind,
      notes: parsed.data.notes || undefined,
    });
    revalidatePath("/admin");
  } catch (error) {
    adminActionFailure("createSettlement", error);
  }
}
