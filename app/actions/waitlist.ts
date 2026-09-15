"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerAuthClaims } from "@/lib/auth-claims.server";
import { OPERATIONAL_RPC_TIMEOUT_MS, withOperationalTimeout } from "@/lib/operations.server";

const schema = z.object({ offer_id: z.string().uuid(), patient_profile_id: z.string().uuid().optional() });

type WaitlistRpcClient = Pick<SupabaseClient, "rpc">;

export async function joinBookingWaitlist(formData: FormData) {
  const parsed = schema.safeParse({ offer_id: formData.get("offer_id"), patient_profile_id: formData.get("patient_profile_id") || undefined });
  if (!parsed.success) redirect("/account?waitlist_error=invalid");
  const { data, error: authError } = await getServerAuthClaims();
  const actorId = data?.claims?.sub;
  if (authError || !actorId) redirect("/login?next=/account");

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    redirect("/account?waitlist_error=unavailable");
  }

  let patientProfileId = parsed.data.patient_profile_id;
  if (!patientProfileId) {
    const { data: selfProfile } = await withOperationalTimeout(
      admin.from("patient_profiles").select("id").eq("account_id", actorId).eq("relationship", "self").is("archived_at", null).maybeSingle(),
    ).catch(() => ({ data: null }));
    patientProfileId = selfProfile?.id;
  }
  if (!patientProfileId) redirect("/account?waitlist_error=profile");

  const rpcClient = admin as unknown as WaitlistRpcClient;
  let rpcError: { code?: string } | null = null;
  try {
    const result = await rpcClient.rpc("join_booking_waitlist_server", {
      p_actor_id: actorId,
      p_offer_id: parsed.data.offer_id,
      p_patient_profile_id: patientProfileId,
    }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS));
    rpcError = result.error;
  } catch {
    redirect("/account?waitlist_error=unavailable");
  }

  if (rpcError) {
    if (rpcError.code === "42501") redirect("/account?waitlist_error=forbidden");
    if (rpcError.code === "22023") redirect("/account?waitlist_error=incomplete");
    redirect("/account?waitlist_error=unavailable");
  }
  redirect("/account?waitlist_success=joined");
}
