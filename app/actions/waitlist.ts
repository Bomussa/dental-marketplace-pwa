"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerAuthClaims } from "@/lib/auth-claims.server";
import { OPERATIONAL_RPC_TIMEOUT_MS } from "@/lib/operations.server";

const schema = z.object({ offer_id: z.string().uuid(), patient_profile_id: z.string().uuid() });

export async function joinBookingWaitlist(formData: FormData) {
  const parsed = schema.safeParse({ offer_id: formData.get("offer_id"), patient_profile_id: formData.get("patient_profile_id") });
  if (!parsed.success) redirect("/account?waitlist_error=invalid");
  const { data, error: authError } = await getServerAuthClaims();
  const actorId = data?.claims?.sub;
  if (authError || !actorId) redirect("/login?next=/account");
  let admin;
  try { admin = createAdminClient(); } catch { redirect("/account?waitlist_error=unavailable"); }
  const { error } = await admin.rpc("join_booking_waitlist_server", { p_actor_id: actorId, p_offer_id: parsed.data.offer_id, p_patient_profile_id: parsed.data.patient_profile_id }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS));
  if (error) {
    if (error.code === "42501") redirect("/account?waitlist_error=forbidden");
    if (error.code === "22023") redirect("/account?waitlist_error=incomplete");
    redirect("/account?waitlist_error=unavailable");
  }
  redirect("/account?waitlist_success=joined");
}
