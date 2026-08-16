"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { operationFailureCode, operationFailureUrl } from "@/lib/operation-feedback";
import { changeClinicBookingStatus, checkInBooking, requestOfferRevision, reverseAttendance } from "@/lib/operations.server";
import { createClient } from "@/lib/supabase/server";
import {
  attendanceReversalSchema,
  attendanceSchema,
  branchSchema,
  clinicApplicationSchema,
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
  const { data, error } = await supabase.auth.getClaims();
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
    const { data, error } = await supabase.rpc("create_clinic_application", { p_legal_name: parsed.data.legal_name, p_display_name: parsed.data.display_name });
    if (error) throw new Error(error.code);
    if (typeof data !== "string") throw new Error("OPERATION_FAILED");
    revalidatePath("/clinic");
  } catch (error) {
    actionFailure("applyClinic", error);
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
    });
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
    const { data, error } = await supabase.from("branch_hours").upsert(
      Array.from({ length: 7 }, (_, weekday) => ({ branch_id: parsed.data.branch_id, weekday, open_time: parsed.data.open_time, close_time: parsed.data.close_time, is_closed: false })),
      { onConflict: "branch_id,weekday" },
    ).select("branch_id,weekday");
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
    const result = await supabase.from("practitioners").insert({ clinic_id: parsed.data.clinic_id, display_name: parsed.data.display_name, license_ref: parsed.data.license_ref || null, active: false }).select("id").single();
    requireReturnedRow(result.data, result.error);
    revalidatePath("/clinic");
  } catch (error) {
    actionFailure("createPractitioner", error);
  }
}

export async function createOffer(formData: FormData): Promise<void> {
  const parsed = offerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("createOffer");
  const supabase = await requireUser();
  try {
    const p = parsed.data;
    const minMinor = p.price_type === "consultation_required" ? null : Math.round((p.min_qar ?? 0) * 100);
    const maxMinor = p.price_type === "fixed" ? minMinor : p.price_type === "range" ? Math.round((p.max_qar ?? 0) * 100) : null;
    const result = await supabase.from("branch_service_offers").insert({ branch_id: p.branch_id, variant_id: p.variant_id, price_type: p.price_type, min_minor: minMinor, max_minor: maxMinor, duration_minutes: p.duration_minutes, status: "draft" }).select("id").single();
    requireReturnedRow(result.data, result.error);
    revalidatePath("/clinic");
  } catch (error) {
    actionFailure("createOffer", error);
  }
}

export async function requestPriceRevision(formData: FormData): Promise<void> {
  const parsed = offerRevisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) validationFailure("requestPriceRevision");
  await requireUser();
  try {
    const p = parsed.data;
    const minMinor = p.price_type === "consultation_required" ? null : Math.round((p.min_qar ?? 0) * 100);
    const maxMinor = p.price_type === "range" ? Math.round((p.max_qar ?? 0) * 100) : null;
    await requestOfferRevision({ offerId: p.offer_id, priceType: p.price_type, minMinor, maxMinor, durationMinutes: p.duration_minutes, reason: p.reason });
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
    const result = await supabase.from("branch_service_offers").update({ status: "active", clinic_attested_at: new Date().toISOString() }).eq("id", parsed.data.id).select("id").maybeSingle();
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
    const result = await supabase.from("availability_slots").insert({ branch_id: parsed.data.branch_id, variant_id: parsed.data.variant_id, start_at: normalizeQatarDateTime(parsed.data.start_at), end_at: normalizeQatarDateTime(parsed.data.end_at), status: "draft" }).select("id").single();
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
    const result = await supabase.from("availability_slots").update({ status: "published", freshness_at: new Date().toISOString() }).eq("id", parsed.data.id).select("id").maybeSingle();
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
