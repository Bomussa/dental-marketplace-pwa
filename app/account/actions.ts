"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { consumeRateLimit, OPERATIONAL_RPC_TIMEOUT_MS } from "@/lib/operations.server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { passwordSchema, patientProfileArchiveSchema, patientProfileSchema, reviewSchema, usernameSchema, uuid } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/login?next=/account");
  return { supabase, userId: data.claims.sub };
}

function profileActionError(code: "invalid" | "unavailable" | "self_exists" | "cannot_archive_self"): never {
  redirect(`/account?patient_profile_error=${code}`);
}

function profileActionSuccess(code: "created" | "archived"): never {
  redirect(`/account?patient_profile_success=${code}`);
}

function bookingActionError(code: "invalid" | "unavailable" | "forbidden" | "not_cancellable"): never {
  redirect(`/account?booking_error=${code}`);
}

function bookingActionSuccess(code: "cancelled"): never {
  redirect(`/account?booking_success=${code}`);
}

function reviewActionError(code: "invalid" | "not_eligible" | "duplicate" | "forbidden" | "unavailable"): never {
  redirect(`/account?review_error=${code}`);
}

function reviewActionSuccess(): never {
  redirect("/account?review_success=submitted");
}

function credentialsActionError(code: "invalid" | "username_taken" | "unavailable"): never {
  redirect(`/account?credentials_error=${code}`);
}

function credentialsActionSuccess(): never {
  redirect("/account?credentials_success=activated");
}

function requireAdmin(onUnavailable: () => never) {
  try {
    return createAdminClient();
  } catch {
    return onUnavailable();
  }
}

export async function activateLoginCredentials(formData: FormData) {
  const parsed = z.object({ username: usernameSchema, password: passwordSchema }).safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return credentialsActionError("invalid");

  const { userId } = await requireUser();
  const admin = requireAdmin(() => credentialsActionError("unavailable"));
  const { data: existing, error: existingError } = await admin.from("account_usernames").select("user_id").eq("user_id", userId).maybeSingle();
  if (existingError) return credentialsActionError("unavailable");
  if (existing) return credentialsActionError("invalid");

  const { error: usernameError } = await admin.from("account_usernames").insert({ user_id: userId, username: parsed.data.username });
  if (usernameError?.code === "23505") return credentialsActionError("username_taken");
  if (usernameError) return credentialsActionError("unavailable");

  const { error: passwordError } = await admin.auth.admin.updateUserById(userId, { password: parsed.data.password });
  if (passwordError) {
    await admin.from("account_usernames").delete().eq("user_id", userId);
    return credentialsActionError("unavailable");
  }

  revalidatePath("/account");
  return credentialsActionSuccess();
}

export async function createPatientProfile(formData: FormData) {
  const parsed = patientProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return profileActionError("invalid");
  const input = parsed.data;

  const { userId } = await requireUser();
  const profileCreateAllowed = await consumeRateLimit({
    scope: "patient_profile_create",
    subject: userId,
    maxRequests: 10,
    windowSeconds: 60 * 60,
  }).catch(() => false);
  if (!profileCreateAllowed) return profileActionError("unavailable");

  const admin = requireAdmin(() => profileActionError("unavailable"));

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
    national_id: input.national_id,
    nationality: input.nationality,
    date_of_birth: input.date_of_birth,
    phone: input.phone,
    phone_verified_at: null,
    gender: input.gender ?? null,
  });
  if (error?.code === "23505") return profileActionError("invalid");
  if (error) return profileActionError("unavailable");

  revalidatePath("/account");
  return profileActionSuccess("created");
}

export async function archivePatientProfile(formData: FormData) {
  const parsed = patientProfileArchiveSchema.safeParse({ patient_profile_id: formData.get("patient_profile_id") });
  if (!parsed.success) return profileActionError("invalid");
  const input = parsed.data;

  const { userId } = await requireUser();
  const admin = requireAdmin(() => profileActionError("unavailable"));
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
  return profileActionSuccess("archived");
}

export async function cancelBooking(formData: FormData) {
  const parsed = z.object({ booking_id: uuid }).safeParse({ booking_id: formData.get("booking_id") });
  if (!parsed.success) return bookingActionError("invalid");

  const { userId } = await requireUser();
  const admin = requireAdmin(() => bookingActionError("unavailable"));
  const { error } = await admin.rpc("cancel_booking_server", {
    p_actor_id: userId,
    p_booking_id: parsed.data.booking_id,
  }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS));

  if (error) {
    if (error.code === "42501") return bookingActionError("forbidden");
    if (error.code === "55000") return bookingActionError("not_cancellable");
    if (error.code === "P0002" || error.code === "22023") return bookingActionError("invalid");
    return bookingActionError("unavailable");
  }

  revalidatePath("/account");
  return bookingActionSuccess("cancelled");
}

export async function submitReview(formData: FormData) {
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return reviewActionError("invalid");

  const { supabase, userId } = await requireUser();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id,clinic_id,practitioner_id,status")
    .eq("id", parsed.data.booking_id)
    .maybeSingle();
  if (bookingError) return reviewActionError("unavailable");
  if (!booking || booking.status !== "completed") return reviewActionError("not_eligible");

  const { error } = await supabase.from("reviews").insert({
    booking_id: booking.id,
    patient_id: userId,
    clinic_id: booking.clinic_id,
    practitioner_id: booking.practitioner_id,
    rating: parsed.data.rating,
    review_text: parsed.data.review_text || null,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") return reviewActionError("duplicate");
    if (error.code === "42501") return reviewActionError("forbidden");
    return reviewActionError("unavailable");
  }

  revalidatePath("/account");
  return reviewActionSuccess();
}
