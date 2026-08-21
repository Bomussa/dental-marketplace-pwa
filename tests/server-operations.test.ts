import { afterEach, describe, expect, it } from "vitest";
import { serverOperationsConfigured } from "@/lib/server-readiness";
import { OPERATIONAL_RPC_TIMEOUT_MS } from "@/lib/operations.server";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalSecret = process.env.SUPABASE_SECRET_KEY;
const originalLegacy = process.env.SUPABASE_SERVICE_ROLE_KEY;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
  else process.env.SUPABASE_SECRET_KEY = originalSecret;
  if (originalLegacy === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalLegacy;
});

describe("serverOperationsConfigured", () => {
  it("keeps operational RPC calls bounded by a 15-second timeout", () => {
    expect(OPERATIONAL_RPC_TIMEOUT_MS).toBe(15_000);
  });

  it("requires a Supabase URL and a server-only secret", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(serverOperationsConfigured()).toBe(false);
  });

  it("accepts the modern Supabase secret key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(serverOperationsConfigured()).toBe(true);
  });

  it("keeps the legacy service-role key as a migration fallback", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy_test";
    expect(serverOperationsConfigured()).toBe(true);
  });
});
