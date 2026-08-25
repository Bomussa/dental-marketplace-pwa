import { describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const hasPublicSupabaseConfig = Boolean(url && key);

describe("Supabase public configuration", () => {
  it.skipIf(!hasPublicSupabaseConfig)("authenticates a read-only settings request with the configured publishable key", async () => {
    const response = await fetch(`${url!}/auth/v1/settings`, {
      headers: { apikey: key! },
    });

    expect(response.status).toBe(200);
  });
});
