"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizedOfferFormData, priceInputsToMinor } from "@/lib/money-input";
import { priceScopeFromFormData, priceScopeItemsFromFormData, priceScopeNotesFromFormData, priceScopeVisitCountFromFormData, type PriceScope } from "@/lib/price-scope";
import { operationFailureCode, operationFailureUrl } from "@/lib/operation-feedback";
import { changeClinicBookingStatus, checkInBooking, OPERATIONAL_RPC_TIMEOUT_MS, requestOfferRevision, reverseAttendance, withOperationalTimeout } from "@/lib/operations.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  attendanceReversalSchema,
  attendanceSchema,
  branchSchema,
  clinicApplicationSchema,
  clinicOperatorAccountIdSchema,
  clinicOperatorAccountSchema,
  dailyHoursSchema,
  normalizeQatarDateTime,
  offerRevisionSchema,
  offerSchema,
  practitionerSchema,
  slotSchema,
  uuid,
} from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await withOperationalTimeout(supabase.auth.getClaims());
  if (error || !data?.claims?.sub) redirect("/login?next=/clinic");
  return supabase;
}

function validationFailure(action: string): never {
  console.warn("Clinic operation rejected", { action, code: "VALIDATION_FAILED" });
  redirect(operationFailureUrl("clinic", action, "invalid"));
}

function actionFailure(action: string, error: unknown): never {
  const internalCode = error instanceof Error && error.message ? error.message : "OPERATION_FAILED";
  console.error("Clinic operation failed", { action, code: internalCode });
  redirect(operationFailureUrl("clinic", action, operationFailureCode(error)));
}

function requireReturnedRow<T>(data: T | null, error: { code?: string } | null): T {
  if (error) throw new Error(error.code || "OPERATION_FAILED");
  if (!data) throw new Error("FORBIDDEN");
  return data;
}

export async function applyClinic(formData: FormData): Promise<void> {
  const parsed = clinicApplicationSchema.safeParse({ legal_name: formData.get("legal_name"), display_name: formData.get("display_name") });
  if (!parsed.success) validationFailure("applyClinic");
  const supabase = await requireUser();
  try {
    const { data, error } = await supabase.rpc("create_clinic_application", { p_legal_name: parsed.data.legal_name, p_display_name: parsed.data.display_name }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS));
    if (error) throw new Error(error.code);
    if (typeof data !== "string") throw new Error("OPERATION_FAILED");
    revalidatePath("/clinic");
  } catch (error) {
    actionFailure("applyClinic", error);
  }
}

export async function createClinicOperatorAccount(formData: FormData): Promise<void> {
  const parsed = clinicOperatorAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("createClinicOperatorAccount");

  const supabase = await requireUser();
  const { data: actorClaims, error: actorClaimsError } = await withOperationalTimeout(supabase.auth.getClaims());
  const actorId = actorClaims?.claims?.sub;
  if (actorClaimsError || !actorId) redirect("/login?next=/clinic");

  const { data: ownerMembership, error: ownerMembershipError } = await withOperationalTimeout(
    supabase
      .from("clinic_memberships")
      .select("id")
      .eq("clinic_id", parsed.data.clinic_id)
      .eq("user_id", actorId)
      .eq("role", "owner")
      .eq("status", "active")
      .maybeSingle(),
  ).catch(() => actionFailure("createClinicOperatorAccount", new Error("SERVICE_UNAVAILABLE")));
  if (ownerMembershipError || !ownerMembership) {
    actionFailure("createClinicOperatorAccount", new Error("FORBIDDEN"));
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    actionFailure("createClinicOperatorAccount", new Error("SERVICE_UNAVAILABLE"));
  }

  const { data: created, error: createError } = await withOperationalTimeout(admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { account_kind: "clinic_operator" },
  })).catch(() => ({ data: { user: null }, error: { code: "OPERATION_TIMEOUT", message: "OPERATION_TIMEOUT" } }));

  if (createError || !created.user) {
    const code = `${createError?.code ?? ""} ${createError?.message ?? ""}`.toLowerCase();
    actionFailure("createClinicOperatorAccount", new Error(code.includes("already") ? "ACCOUNT_EXISTS" : "OPERATION_FAILED"));
  }

  try {
    const { error } = await admin.rpc("provision_clinic_operator_account_server", {
      p_actor_id: actorId,
      p_clinic_id: parsed.data.clinic_id,
      p_user_id: created.user.id,
      p_username: parsed.data.username,
    }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS));
    if (error) throw new Error(error.code || "OPERATION_FAILED");
    revalidatePath("/clinic");
  } catch (error) {
    await withOperationalTimeout(admin.auth.admin.deleteUser(created.user.id)).catch(() => undefined);
    actionFailure("createClinicOperatorAccount", error);
  }
}

export async function revokeClinicOperatorAccount(formData: FormData): Promise<void> {
  const parsed = clinicOperatorAccountIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("revokeClinicOperatorAccount");
  const supabase = await requireUser();
  const { data: actorClaims, error: actorClaimsError } = await withOperationalTimeout(supabase.auth.getClaims());
  const actorId = actorClaims?.claims?.sub;
  if (actorClaimsError || !actorId) redirect("/login?next=/clinic");

  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("revoke_clinic_operator_account_server", {
      p_actor_id: actorId,
      p_operator_account_id: parsed.data.operator_account_id,
    }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS));
    if (error) throw new Error(error.code || "OPERATION_FAILED");
    revalidatePath("/clinic");
  } catch (error) {
    actionFailure("revokeClinicOperatorAccount", error);
  }
}

export async function createBranch(formData: FormData): Promise<void> {
  const parsed = branchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("createBranch");
  const supabase = await requireUser();
  try {
    const { data, error } = await supabase.rpc("create_branch_application", {
      p_clinic_id: parsed.data.clinic_id,
      p_name: parsed.data.name,
      p_area: parsed.data.area || undefined,
      p_address_line: parsed.data.address_line || undefined,
      p_lat: parsed.data.lat === "" || parsed.data.lat === undefined ? undefined : parsed.data.lat,
      p_lng: parsed.data.lng === "" || parsed.data.lng === undefined ? undefined : parsed.data.lng,
    }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS));
    if (error) throw new Error(error.code);
    if (typeof data !== "string") throw new Error("OPERATION_FAILED");
    revalidatePath("/clinic");
  } catch (error) {
    actionFailure("createBranch", error);
  }
}

export async function setDailyHours(formData: FormData): Promise<void> {
  const parsed = dailyHoursSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("setDailyHours");
  const supabase = await requireUser();
  try {
    const { data, error } = await withOperationalTimeout(supabase.from("branch_hours").upsert(
      Array.from({ length: 7 }, (_, weekday) => ({ branch_id: parsed.data.branch_id, weekday, open_time: parsed.data.open_time, close_time: parsed.data.close_time, is_closed: false })),
      { onConflict: "branch_id,weekday" },
    ).select("branch_id,weekday"));
    if (error) throw new Error(error.code);
    if (!data || data.length !== 7) throw new Error("OPERATION_FAILED");
    revalidatePath("/clinic");
  } catch (error) {
    actionFailure("setDailyHours", error);
  }
}

export async function createPractitioner(formData: FormData): Promise<void> {
  const parsed = practitionerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("createPractitioner");
  const supabase = await requireUser();
  try {
    const result = await withOperationalTimeout(supabase.from("practitioners").insert({ clinic_id: parsed.data.clinic_id, display_name: parsed.data.display_name, license_ref: parsed.data.license_ref || null, active: false }).select("id").single());
    requireReturnedRow(result.data, result.error);
    revalidatePath("/clinic");
  } catch (error) {
    actionFailure("createPractitioner", error);
  }
}

export async function createOffer(formData: FormData): Promise<void> {
  const parsed = offerSchema.safeParse(normalizedOfferFormData(formData));
  if (!parsed.success) validationFailure("createOffer");

  let money: { minMinor: number | null; maxMinor: number | null };
  try {
    money = priceInputsToMinor(parsed.data.price_type, formData.get("min_qar"), formData.get("max_qar"));
  } catch {
    validationFailure("createOffer");
  }

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
    validationFailure("createOffer");
  }

  const supabase = await requireUser();
  try {
    const p = parsed.data;
    const result = await withOperationalTimeout(supabase.from("branch_service_offers").insert({
      branch_id: p.branch_id,
      variant_id: p.variant_id,
      price_type: p.price_type,
      min_minor: money.minMinor,
      max_minor: money.maxMinor,
      duration_minutes: p.duration_minutes,
      price_scope: scope,
      included_items: includedItems,
      excluded_items: excludedItems,
      visit_count: visitCount,
      follow_up_terms: followUpTerms,
      notes,
      status: "draft",
    }).select("id").single());
    requireReturnedRow(result.data, result.error);
    revalidatePath("/clinic");
  } catch (error) {
    actionFailure("createOffer", error);
  }
}

export async function requestPriceRevision(formData: FormData): Promise<void> {
  const parsed = offerRevisionSchema.safeParse(normalizedOfferFormData(formData));
  if (!parsed.success) validationFailure("requestPriceRevision");

  let money: { minMinor: number | null; maxMinor: number | null };
  try {
    money = priceInputsToMinor(parsed.data.price_type, formData.get("min_qar"), formData.get("max_qar"));
  } catch {
    validationFailure("requestPriceRevision");
  }

  await requireUser();
  try {
    const p = parsed.data;
    await requestOfferRevision({
      offerId: p.offer_id,
      priceType: p.price_type,
      minMinor: money.minMinor,
      maxMinor: money.maxMinor,
      durationMinutes: p.duration_minutes,
      reason: p.reason,
    });
    revalidatePath("/clinic");
    revalidatePath("/admin");
  } catch (error) {
    actionFailure("requestPriceRevision", error);
  }
}

export async function publishOffer(formData: FormData): Promise<void> {
  const parsed = z.object({ id: uuid }).safeParse({ id: formData.get("id") });
  if (!parsed.success) validationFailure("publishOffer");
  const supabase = await requireUser();
  try {
    const result = await withOperationalTimeout(supabase.from("branch_service_offers").update({ status: "active", clinic_attested_at: new Date().toISOString() }).eq("id", parsed.data.id).select("id").maybeSingle());
    requireReturnedRow(result.data, result.error);
    revalidatePath("/clinic");
  } catch (error) {
    actionFailure("publishOffer", error);
  }
}

export async function createSlot(formData: FormData): Promise<void> {
  const parsed = slotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("createSlot");
  const supabase = await requireUser();
  try {
    const result = await withOperationalTimeout(supabase.from("availability_slots").insert({ branch_id: parsed.data.branch_id, variant_id: parsed.data.variant_id, start_at: normalizeQatarDateTime(parsed.data.start_at), end_at: normalizeQatarDateTime(parsed.data.end_at), status: "draft" }).select("id").single());
    requireReturnedRow(result.data, result.error);
    revalidatePath("/clinic");
  } catch (error) {
    actionFailure("createSlot", error);
  }
}

export async function publishSlot(formData: FormData): Promise<void> {
  const parsed = z.object({ id: uuid }).safeParse({ id: formData.get("id") });
  if (!parsed.success) validationFailure("publishSlot");
  const supabase = await requireUser();
  try {
    const result = await withOperationalTimeout(supabase.from("availability_slots").update({ status: "published", freshness_at: new Date().toISOString() }).eq("id", parsed.data.id).select("id").maybeSingle());
    requireReturnedRow(result.data, result.error);
    revalidatePath("/clinic");
  } catch (error) {
    actionFailure("publishSlot", error);
  }
}

export async function markBookingCheckedIn(formData: FormData): Promise<void> {
  const parsed = attendanceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("markBookingCheckedIn");
  await requireUser();
  try {
    await checkInBooking({ bookingId: parsed.data.booking_id, reason: parsed.data.reason || undefined });
    revalidatePath("/clinic");
    revalidatePath("/admin");
  } catch (error) {
    actionFailure("markBookingCheckedIn", error);
  }
}

export async function reverseBookingCheckIn(formData: FormData): Promise<void> {
  const parsed = attendanceReversalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("reverseBookingCheckIn");
  await requireUser();
  try {
    await reverseAttendance({ bookingId: parsed.data.booking_id, reason: parsed.data.reason });
    revalidatePath("/clinic");
    revalidatePath("/admin");
  } catch (error) {
    actionFailure("reverseBookingCheckIn", error);
  }
}

export async function changeBookingStatus(formData: FormData): Promise<void> {
  const parsed = z.object({
    booking_id: uuid,
    status: z.enum(["confirmed", "completed", "clinic_cancelled", "no_show", "failed"]),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("changeBookingStatus");
  await requireUser();
  try {
    await changeClinicBookingStatus({ bookingId: parsed.data.booking_id, status: parsed.data.status });
    revalidatePath("/clinic");
  } catch (error) {
    actionFailure("changeBookingStatus", error);
  }
}
