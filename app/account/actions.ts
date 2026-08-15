"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { patientProfileArchiveSchema, patientProfileSchema, reviewSchema, uuid } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/login?next=/account");
  return { supabase, userId: data.claims.sub };
}

function profileActionError(code: "invalid" | "unavailable" | "self_exists" | "cannot_archive_self"): never {
  redirect(`/account?patient_profile_error=${code}`);
}

function bookingActionError(code: "invalid" | "unavailable" | "forbidden" | "not_cancellable"): never {
  redirect(`/account?booking_error=${code}`);
}

function requireAdmin() {
  try {
    return createAdminClient();
  } catch {
    return profileActionError("unavailable");
  }
}

export async function createPatientProfile(formData: FormData) {
  const parsed = patientProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return profileActionError("invalid");
  const input = parsed.data;

  const { userId } = await requireUser();
  const admin = requireAdmin();

  if (input.relationship === "self") {
    const { data: selfProfile, error } = await admin
      .from("patient_profiles")
      .select("id")
      .eq("account_id", userId)
      .eq("relationship", "self")
      .is("archived_at", null)
      .maybeSingle();
    if (error) return profileActionError("unavailable");
    if (selfProfile) return profileActionError("self_exists");
  }

  const { error } = await admin.from("patient_profiles").insert({
    account_id: userId,
    display_name: input.display_name,
    relationship: input.relationship,
    date_of_birth: input.date_of_birth ?? null,
    gender: input.gender ?? null,
  });
  if (error) return profileActionError("unavailable");

  revalidatePath("/account");
}

export async function archivePatientProfile(formData: FormData) {
  const parsed = patientProfileArchiveSchema.safeParse({ patient_profile_id: formData.get("patient_profile_id") });
  if (!parsed.success) return profileActionError("invalid");
  const input = parsed.data;

  const { userId } = await requireUser();
  const admin = requireAdmin();
  const { data: profile, error: readError } = await admin
    .from("patient_profiles")
    .select("id,relationship")
    .eq("id", input.patient_profile_id)
    .eq("account_id", userId)
    .is("archived_at", null)
    .maybeSingle();
  if (readError || !profile) return profileActionError("invalid");
  if (profile.relationship === "self") return profileActionError("cannot_archive_self");

  const { error } = await admin
    .from("patient_profiles")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", profile.id)
    .eq("account_id", userId);
  if (error) return profileActionError("unavailable");

  revalidatePath("/account");
}

export async function cancelBooking(formData: FormData) {
  const parsed = z.object({ booking_id: uuid }).safeParse({ booking_id: formData.get("booking_id") });
  if (!parsed.success) return bookingActionError("invalid");

  const { userId } = await requireUser();
  const admin = requireAdmin();
  const { error } = await admin.rpc("cancel_booking_server", {
    p_actor_id: userId,
    p_booking_id: parsed.data.booking_id,
  });

  if (error) {
    if (error.code === "42501") return bookingActionError("forbidden");
    if (error.code === "55000") return bookingActionError("not_cancellable");
    if (error.code === "P0002" || error.code === "22023") return bookingActionError("invalid");
    return bookingActionError("unavailable");
  }

  revalidatePath("/account");
}

export async function submitReview(formData: FormData) {
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { supabase, userId } = await requireUser();
  const { data: booking } = await supabase.from("bookings").select("id,clinic_id,practitioner_id,status").eq("id", parsed.data.booking_id).maybeSingle();
  if (!booking || booking.status !== "completed") return;
  await supabase.from("reviews").insert({
    booking_id: booking.id,
    patient_id: userId,
    clinic_id: booking.clinic_id,
    practitioner_id: booking.practitioner_id,
    rating: parsed.data.rating,
    review_text: parsed.data.review_text || null,
    status: "pending",
  });
  revalidatePath("/account");
}
