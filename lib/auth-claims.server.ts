import "server-only";

import { cache } from "react";
import { withOperationalTimeout } from "@/lib/operations.server";
import { createClient } from "@/lib/supabase/server";

export const getServerSupabaseClient = cache(async () => createClient());

export const getServerAuthClaims = cache(async () => {
  const supabase = await getServerSupabaseClient();
  return withOperationalTimeout(supabase.auth.getClaims());
});

/**
 * Fast, presentation-only session lookup for public navigation.
 * Authorization decisions must continue to use getServerAuthClaims or a protected server action.
 */
export const getServerUiSession = cache(async () => {
  const supabase = await getServerSupabaseClient();
  return withOperationalTimeout(supabase.auth.getSession());
});
