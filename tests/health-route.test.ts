import { beforeEach, describe, expect, it, vi } from "vitest";

const select = vi.fn();
const limit = vi.fn();
const from = vi.fn(() => ({ select }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from })),
}));

vi.mock("@/lib/operations.server", () => ({
  withOperationalTimeout: vi.fn(async <T>(operation: Promise<T>) => operation),
}));

import { GET } from "@/app/api/health/route";

describe("public health route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports only service health when the database check succeeds", async () => {
    const eq = vi.fn();
    select.mockReturnValue({ eq });
    eq.mockReturnValue({ limit });
    limit.mockResolvedValue({ error: null });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, time: expect.any(String) });
    expect(payload).not.toHaveProperty("database");
    expect(payload).not.toHaveProperty("server_operations");
    expect(payload).not.toHaveProperty("treatments");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("does not disclose dependency details when the database check fails", async () => {
    const eq = vi.fn();
    select.mockReturnValue({ eq });
    eq.mockReturnValue({ limit });
    limit.mockResolvedValue({ error: { code: "UNAVAILABLE" } });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({ ok: false, time: expect.any(String) });
    expect(payload).not.toHaveProperty("database");
    expect(payload).not.toHaveProperty("server_operations");
  });
});
