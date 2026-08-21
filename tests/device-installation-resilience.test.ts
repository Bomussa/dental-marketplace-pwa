import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcResponses: Array<{ data: unknown; error: { code?: string } | null; status: number }> = [];
const rpcMock = vi.fn((functionName: string, args: Record<string, unknown>) => {
  void functionName;
  void args;
  return {
    abortSignal: vi.fn(async () => {
      const next = rpcResponses.shift();
      if (!next) throw new Error("missing mocked RPC response");
      return next;
    }),
    then: undefined,
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: rpcMock }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { registerDeviceInstallationGuarded } from "@/lib/operations.server";

const input = {
  accountId: null,
  installationId: "11111111-1111-4111-8111-111111111111",
  clientSubject: "203.0.113.10",
  deviceClass: "unknown" as const,
  platform: "test",
};

describe("guarded device installation registration", () => {
  beforeEach(() => {
    rpcResponses.length = 0;
    rpcMock.mockClear();
  });

  it("retries one transient 401 with a fresh server RPC attempt and succeeds", async () => {
    rpcResponses.push(
      { data: null, error: { code: "PGRST301" }, status: 401 },
      { data: "ok", error: null, status: 200 },
    );

    await expect(registerDeviceInstallationGuarded(input)).resolves.toBe("ok");
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock.mock.calls[0]?.[0]).toBe("register_device_installation_guarded_server");

    const args = rpcMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(args.p_client_subject_key).toMatch(/^[0-9a-f]{64}$/);
    expect(args.p_installation_subject_key).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(args)).not.toContain(input.clientSubject);
  });

  it("does not retry non-auth failures that could have reached Postgres", async () => {
    rpcResponses.push({ data: null, error: { code: "PGRST001" }, status: 503 });

    await expect(registerDeviceInstallationGuarded(input)).rejects.toThrow("PGRST001");
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });
});
