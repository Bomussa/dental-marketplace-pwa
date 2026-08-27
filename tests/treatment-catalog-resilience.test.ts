import { afterEach, describe, expect, it, vi } from "vitest";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(loader: T) => loader,
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/operations.server", () => ({ withOperationalTimeout: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
});

describe("active treatment catalog resilience", () => {
  it("contains a transient operational timeout as the existing catalog error state", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";

    const { createClient } = await import("@supabase/supabase-js");
    const { withOperationalTimeout } = await import("@/lib/operations.server");
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    vi.mocked(createClient).mockReturnValue({ from: vi.fn().mockReturnValue(query) } as never);
    vi.mocked(withOperationalTimeout).mockRejectedValue(new Error("OPERATION_TIMEOUT"));

    const { getActiveTreatmentCatalog } = await import("@/lib/treatment-catalog.server");
    await expect(getActiveTreatmentCatalog()).resolves.toEqual({
      treatments: [],
      variants: [],
      hasError: true,
    });
  });
});
