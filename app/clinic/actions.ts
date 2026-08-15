"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkInBooking, requestOfferRevision, reverseAttendance } from "@/lib/operations.server";
import { createClient } from "@/lib/supabase/server";
import {
  attendanceReversalSchema,
  attendanceSchema,
  bookingStatusSchema,
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

function actionFailure(error: unknown): void {
  const code = error instanceof Error && error.message ? error.message : "OPERATION_FAILED";
  console.error("Clinic operation failed", { code });
}

export async function applyClinic(formData: FormData): Promise<void> {
  const parsed = clinicApplicationSchema.safeParse({ legal_name: formData.get("legal_name"), display_name: formData.get("display_name") });
  if (!parsed.success) {
    console.warn("Clinic operation rejected", { code: "VALIDATION_FAILED" });
    return;
  }
  try {
    const supabase = await requireUser();
    const { error } = await supabase.rpc("create_clinic_application", { p_legal_name: parsed.data.legal_name, p_display_name: parsed.data.display_name });
    if (error) throw new Error(error.code);
    revalidatePath("/clinic");
    return;
  } catch (error) {
    return actionFailure(error);
  }
}

export async function createBranch(formData: FormData): Promise<void> {
  const parsed = branchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    console.warn("Clinic operation rejected", { code: "VALIDATION_FAILED" });
    return;
  }
  try {
    const supabase = await requireUser();
    const { error } = await supabase.rpc("create_branch_application", {
      p_clinic_id: parsed.data.clinic_id,
      p_name: parsed.data.name,
      p_area: parsed.data.area || undefined,
      p_address_line: parsed.data.address_line || undefined,
      p_lat: parsed.data.lat === "" || parsed.data.lat === undefined ? undefined : parsed.data.lat,
      p_lng: parsed.data.lng === "" || parsed.data.lng === undefined ? undefined : parsed.data.lng,
    });
    if (error) throw new Error(error.code);
    revalidatePath("/clinic");
    return;
  } catch (error) {
    return actionFailure(error);
  }
}

export async function setDailyHours(formData: FormData): Promise<void> {
  const parsed = dailyHoursSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    console.warn("Clinic operation rejected", { code: "VALIDATION_FAILED" });
    return;
  }
  try {
    const supabase = await requireUser();
    const { error } = await supabase.from("branch_hours").upsert(
      Array.from({ length: 7 }, (_, weekday) => ({ branch_id: parsed.data.branch_id, weekday, open_time: parsed.data.open_time, close_time: parsed.data.close_time, is_closed: false })),
      { onConflict: "branch_id,weekday" },
    );
    if (error) throw new Error(error.code);
    revalidatePath("/clinic");
    return;
  } catch (error) {
    return actionFailure(error);
  }
}

export async function createPractitioner(formData: FormData): Promise<void> {
  const parsed = practitionerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    console.warn("Clinic operation rejected", { code: "VALIDATION_FAILED" });
    return;
  }
  try {
    const supabase = await requireUser();
    const { error } = await supabase.from("practitioners").insert({ clinic_id: parsed.data.clinic_id, display_name: parsed.data.display_name, license_ref: parsed.data.license_ref || null, active: false });
    if (error) throw new Error(error.code);
    revalidatePath("/clinic");
    return;
  } catch (error) {
    return actionFailure(error);
  }
}

export async function createOffer(formData: FormData): Promise<void> {
  const parsed = offerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    console.warn("Clinic operation rejected", { code: "VALIDATION_FAILED" });
    return;
  }
  try {
    const supabase = await requireUser();
    const p = parsed.data;
    const minMinor = p.price_type === "consultation_required" ? null : Math.round((p.min_qar ?? 0) * 100);
    const maxMinor = p.price_type === "fixed" ? minMinor : p.price_type === "range" ? Math.round((p.max_qar ?? 0) * 100) : null;
    const { error } = await supabase.from("branch_service_offers").insert({ branch_id: p.branch_id, variant_id: p.variant_id, price_type: p.price_type, min_minor: minMinor, max_minor: maxMinor, duration_minutes: p.duration_minutes, status: "draft" });
    if (error) throw new Error(error.code);
    revalidatePath("/clinic");
    return;
  } catch (error) {
    return actionFailure(error);
  }
}

export async function requestPriceRevision(formData: FormData): Promise<void> {
  const parsed = offerRevisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    console.warn("Clinic operation rejected", { code: "VALIDATION_FAILED" });
    return;
  }
  try {
    const p = parsed.data;
    const minMinor = p.price_type === "consultation_required" ? null : Math.round((p.min_qar ?? 0) * 100);
    const maxMinor = p.price_type === "range" ? Math.round((p.max_qar ?? 0) * 100) : null;
    await requestOfferRevision({
      offerId: p.offer_id,
      priceType: p.price_type,
      minMinor,
      maxMinor,
      durationMinutes: p.duration_minutes,
      reason: p.reason,
    });
    revalidatePath("/clinic");
    revalidatePath("/admin");
    return;
  } catch (error) {
    return actionFailure(error);
  }
}

export async function publishOffer(formData: FormData): Promise<void> {
  const parsed = z.object({ id: uuid }).safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    console.warn("Clinic operation rejected", { code: "VALIDATION_FAILED" });
    return;
  }
  try {
    const supabase = await requireUser();
    const { error } = await supabase.from("branch_service_offers").update({ status: "active", clinic_attested_at: new Date().toISOString() }).eq("id", parsed.data.id);
    if (error) throw new Error(error.code);
    revalidatePath("/clinic");
    return;
  } catch (error) {
    return actionFailure(error);
  }
}

export async function createSlot(formData: FormData): Promise<void> {
  const parsed = slotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    console.warn("Clinic operation rejected", { code: "VALIDATION_FAILED" });
    return;
  }
  try {
    const supabase = await requireUser();
    const { error } = await supabase.from("availability_slots").insert({ branch_id: parsed.data.branch_id, variant_id: parsed.data.variant_id, start_at: normalizeQatarDateTime(parsed.data.start_at), end_at: normalizeQatarDateTime(parsed.data.end_at), status: "draft" });
    if (error) throw new Error(error.code);
    revalidatePath("/clinic");
    return;
  } catch (error) {
    return actionFailure(error);
  }
}

export async function publishSlot(formData: FormData): Promise<void> {
  const parsed = z.object({ id: uuid }).safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    console.warn("Clinic operation rejected", { code: "VALIDATION_FAILED" });
    return;
  }
  try {
    const supabase = await requireUser();
    const { error } = await supabase.from("availability_slots").update({ status: "published", freshness_at: new Date().toISOString() }).eq("id", parsed.data.id);
    if (error) throw new Error(error.code);
    revalidatePath("/clinic");
    return;
  } catch (error) {
    return actionFailure(error);
  }
}

export async function markBookingCheckedIn(formData: FormData): Promise<void> {
  const parsed = attendanceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    console.warn("Clinic operation rejected", { code: "VALIDATION_FAILED" });
    return;
  }
  try {
    await checkInBooking({ bookingId: parsed.data.booking_id, reason: parsed.data.reason || undefined });
    revalidatePath("/clinic");
    revalidatePath("/admin");
    return;
  } catch (error) {
    return actionFailure(error);
  }
}

export async function reverseBookingCheckIn(formData: FormData): Promise<void> {
  const parsed = attendanceReversalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    console.warn("Clinic operation rejected", { code: "VALIDATION_FAILED" });
    return;
  }
  try {
    await reverseAttendance({ bookingId: parsed.data.booking_id, reason: parsed.data.reason });
    revalidatePath("/clinic");
    revalidatePath("/admin");
    return;
  } catch (error) {
    return actionFailure(error);
  }
}

export async function changeBookingStatus(formData: FormData): Promise<void> {
  const parsed = bookingStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.status === "checked_in") {
    console.warn("Clinic operation rejected", { code: "STATUS_TRANSITION_NOT_ALLOWED" });
    return;
  }
  try {
    const supabase = await requireUser();
    const { error } = await supabase.from("bookings").update({ status: parsed.data.status }).eq("id", parsed.data.booking_id);
    if (error) throw new Error(error.code);
    revalidatePath("/clinic");
    return;
  } catch (error) {
    return actionFailure(error);
  }
}
