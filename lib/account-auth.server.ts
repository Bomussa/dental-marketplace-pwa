import "server-only";

import { withOperationalTimeout } from "@/lib/operations.server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { z } from "zod";
import type { patientBookingRegistrationSchema } from "@/lib/validation";

type PatientRegistration = z.infer<typeof patientBookingRegistrationSchema>;
type ProvisionResult =
  | { ok: true; userId: string; patientProfileId: string }
  | { ok: false; code: "username_taken" | "email_taken" | "national_id_taken" | "phone_taken" | "unavailable" };

const DECOY_USER_ID = "00000000-0000-0000-0000-000000000000";

function conflictCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const candidate = error as { code?: unknown; message?: unknown; details?: unknown };
  return `${candidate.code ?? ""} ${candidate.message ?? ""} ${candidate.details ?? ""}`.toLowerCase();
}

function patientProfileConflict(error: unknown): "national_id_taken" | "phone_taken" | "unavailable" {
  const conflict = conflictCode(error);
  if (conflict.includes("patient_profiles_phone_key")) return "phone_taken";
  if (conflict.includes("patient_profiles_national_id_key")) return "national_id_taken";
  return "unavailable";
}

async function cleanupProvisionedPatientAccount(userId: string) {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return;
  }
  await withOperationalTimeout(admin.from("account_usernames").delete().eq("user_id", userId)).catch(() => undefined);
  await withOperationalTimeout(admin.from("patient_profiles").delete().eq("account_id", userId)).catch(() => undefined);
  await withOperationalTimeout(admin.auth.admin.deleteUser(userId)).catch(() => undefined);
}

export async function emailForUsername(username: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data: usernameRow, error: usernameError } = await withOperationalTimeout(
      admin
        .from("account_usernames")
        .select("user_id")
        .eq("username", username)
        .is("disabled_at", null)
        .maybeSingle(),
    );

    const { data: userResult, error: userError } = await withOperationalTimeout(admin.auth.admin.getUserById(usernameRow?.user_id ?? DECOY_USER_ID));
    if (usernameError || !usernameRow || userError || !userResult.user?.email || userResult.user.banned_until) return null;
    return userResult.user.email;
  } catch {
    return null;
  }
}

export async function provisionPatientBookingAccount(input: PatientRegistration): Promise<ProvisionResult> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, code: "unavailable" };
  }

  const { data: created, error: createError } = await withOperationalTimeout(admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { display_name: input.display_name, account_kind: "patient" },
  })).catch(() => ({ data: { user: null }, error: { code: "OPERATION_TIMEOUT" } }));

  if (createError || !created.user) {
    return { ok: false, code: conflictCode(createError).includes("already") ? "email_taken" : "unavailable" };
  }

  const userId = created.user.id;
  try {
    const { error: usernameError } = await withOperationalTimeout(admin.from("account_usernames").insert({ user_id: userId, username: input.username }));
    if (usernameError) {
      await cleanupProvisionedPatientAccount(userId);
      return { ok: false, code: conflictCode(usernameError).includes("account_usernames") || usernameError.code === "23505" ? "username_taken" : "unavailable" };
    }

    const profilePayload = {
      account_id: userId,
      display_name: input.display_name,
      relationship: "self" as const,
      national_id: input.national_id,
      nationality: input.nationality,
      date_of_birth: input.date_of_birth ?? null,
      phone: input.phone,
      gender: input.gender ?? null,
      phone_verified_at: null,
    };
    const { data: existingProfile, error: existingProfileError } = await withOperationalTimeout(
      admin
        .from("patient_profiles")
        .update(profilePayload)
        .eq("account_id", userId)
        .eq("relationship", "self")
        .is("archived_at", null)
        .select("id")
        .maybeSingle(),
    );

    if (existingProfileError) {
      await cleanupProvisionedPatientAccount(userId);
      return { ok: false, code: existingProfileError.code === "23505" ? patientProfileConflict(existingProfileError) : "unavailable" };
    }

    if (existingProfile) return { ok: true, userId, patientProfileId: existingProfile.id };

    const { data: insertedProfile, error: insertProfileError } = await withOperationalTimeout(
      admin
        .from("patient_profiles")
        .insert(profilePayload)
        .select("id")
        .single(),
    );
    if (insertProfileError || !insertedProfile) {
      await cleanupProvisionedPatientAccount(userId);
      return { ok: false, code: insertProfileError?.code === "23505" ? patientProfileConflict(insertProfileError) : "unavailable" };
    }

    return { ok: true, userId, patientProfileId: insertedProfile.id };
  } catch {
    await cleanupProvisionedPatientAccount(userId);
    return { ok: false, code: "unavailable" };
  }
}
