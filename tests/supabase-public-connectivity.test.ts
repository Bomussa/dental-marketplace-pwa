import { describe, expect, it } from "vitest";

describe("Supabase public configuration", () => {
  it("authenticates a read-only settings request with the configured publishable key", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(url).toBeTruthy();
    expect(key).toBeTruthy();

    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key! },
    });

    expect(response.status).toBe(200);
  });
});
