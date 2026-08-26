import { describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const hasPublicSupabaseConfig = Boolean(url && key);
const runRemoteConnectivityCheck = process.env.RUN_SUPABASE_CONNECTIVITY_TESTS === "true";

describe("Supabase public configuration", () => {
  it.skipIf(!hasPublicSupabaseConfig)("has a valid public HTTPS endpoint and publishable key", () => {
    expect(url).toMatch(/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i);
    expect(key).toMatch(/^sb_publishable_[A-Za-z0-9_-]+$/);
  });

  it.skipIf(!hasPublicSupabaseConfig || !runRemoteConnectivityCheck)(
    "authenticates a read-only settings request with the configured publishable key",
    async () => {
      const response = await fetch(`${url!}/auth/v1/settings`, {
        headers: { apikey: key! },
        signal: AbortSignal.timeout(12_000),
      });

      expect(response.status).toBe(200);
    },
    15_000,
  );
});
