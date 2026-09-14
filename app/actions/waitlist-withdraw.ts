"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerAuthClaims } from "@/lib/auth-claims.server";
import { OPERATIONAL_RPC_TIMEOUT_MS } from "@/lib/operations.server";

type WaitlistRpcClient = Pick<SupabaseClient, "rpc">;
const schema = z.object({ waitlist_id: z.string().uuid() });

export async function withdrawBookingWaitlist(formData: FormData) {
  const parsed = schema.safeParse({ waitlist_id: formData.get("waitlist_id") });
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

  const rpcClient = admin as unknown as WaitlistRpcClient;
  let rpcError: { code?: string } | null = null;
  try {
    const result = await rpcClient.rpc("withdraw_booking_waitlist_server", {
      p_actor_id: actorId,
      p_waitlist_id: parsed.data.waitlist_id,
    }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS));
    rpcError = result.error;
  } catch {
    redirect("/account?waitlist_error=unavailable");
  }

  if (rpcError) {
    if (rpcError.code === "42501") redirect("/account?waitlist_error=forbidden");
    if (rpcError.code === "55000") redirect("/account?waitlist_error=state");
    redirect("/account?waitlist_error=unavailable");
  }

  redirect("/account?waitlist_success=withdrawn");
}
