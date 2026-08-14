"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { bookingStatusSchema, branchSchema, clinicApplicationSchema, dailyHoursSchema, normalizeQatarDateTime, offerSchema, practitionerSchema, slotSchema, uuid } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/login?next=/clinic");
  return supabase;
}

export async function applyClinic(formData: FormData) {
  const parsed = clinicApplicationSchema.safeParse({ legal_name: formData.get("legal_name"), display_name: formData.get("display_name") });
  if (!parsed.success) return;
  const supabase = await requireUser();
  await supabase.rpc("create_clinic_application", { p_legal_name: parsed.data.legal_name, p_display_name: parsed.data.display_name });
  revalidatePath("/clinic");
}

export async function createBranch(formData: FormData) {
  const parsed = branchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await requireUser();
  const lat = parsed.data.lat === "" || parsed.data.lat === undefined ? null : parsed.data.lat;
  const lng = parsed.data.lng === "" || parsed.data.lng === undefined ? null : parsed.data.lng;
  await supabase.rpc("create_branch_application", { p_clinic_id: parsed.data.clinic_id, p_name: parsed.data.name, p_area: parsed.data.area || null, p_address_line: parsed.data.address_line || null, p_lat: lat, p_lng: lng });
  revalidatePath("/clinic");
}

export async function setDailyHours(formData: FormData) {
  const parsed = dailyHoursSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await requireUser();
  await supabase.from("branch_hours").upsert(Array.from({length:7},(_,weekday)=>({ branch_id:parsed.data.branch_id, weekday, open_time:parsed.data.open_time, close_time:parsed.data.close_time, is_closed:false })), { onConflict:"branch_id,weekday" });
  revalidatePath("/clinic");
}

export async function createPractitioner(formData: FormData) {
  const parsed = practitionerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await requireUser();
  await supabase.from("practitioners").insert({ clinic_id:parsed.data.clinic_id, display_name:parsed.data.display_name, license_ref:parsed.data.license_ref || null, active:false });
  revalidatePath("/clinic");
}

export async function createOffer(formData: FormData) {
  const parsed = offerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await requireUser();
  const p = parsed.data;
  const minMinor = p.price_type === "consultation_required" ? null : Math.round((p.min_qar ?? 0) * 100);
  const maxMinor = p.price_type === "fixed" ? minMinor : p.price_type === "range" ? Math.round((p.max_qar ?? 0) * 100) : null;
  await supabase.from("branch_service_offers").insert({ branch_id:p.branch_id, variant_id:p.variant_id, price_type:p.price_type, min_minor:minMinor, max_minor:maxMinor, duration_minutes:p.duration_minutes, status:"draft" });
  revalidatePath("/clinic");
}

export async function publishOffer(formData: FormData) {
  const parsed=z.object({id:uuid}).safeParse({id:formData.get("id")}); if(!parsed.success)return;
  const supabase=await requireUser();
  await supabase.from("branch_service_offers").update({status:"active",clinic_attested_at:new Date().toISOString()}).eq("id",parsed.data.id);
  revalidatePath("/clinic");
}

export async function createSlot(formData: FormData) {
  const parsed = slotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await requireUser();
  await supabase.from("availability_slots").insert({ branch_id:parsed.data.branch_id, variant_id:parsed.data.variant_id, start_at:normalizeQatarDateTime(parsed.data.start_at), end_at:normalizeQatarDateTime(parsed.data.end_at), status:"draft" });
  revalidatePath("/clinic");
}

export async function publishSlot(formData: FormData) {
  const parsed=z.object({id:uuid}).safeParse({id:formData.get("id")}); if(!parsed.success)return;
  const supabase=await requireUser();
  await supabase.from("availability_slots").update({status:"published",freshness_at:new Date().toISOString()}).eq("id",parsed.data.id);
  revalidatePath("/clinic");
}

export async function changeBookingStatus(formData: FormData) {
  const parsed=bookingStatusSchema.safeParse(Object.fromEntries(formData)); if(!parsed.success)return;
  const supabase=await requireUser();
  await supabase.from("bookings").update({status:parsed.data.status}).eq("id",parsed.data.booking_id);
  revalidatePath("/clinic");
}
