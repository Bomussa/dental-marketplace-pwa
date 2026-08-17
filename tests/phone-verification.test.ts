import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmPhoneVerification, PhoneVerificationUnavailableError, startPhoneVerification } from "@/lib/phone-verification.server";

const originalFetch = globalThis.fetch;
const originalServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
const originalApiKey = process.env.TWILIO_API_KEY;
const originalApiSecret = process.env.TWILIO_API_SECRET;

function restoreEnv(name: "TWILIO_VERIFY_SERVICE_SID" | "TWILIO_API_KEY" | "TWILIO_API_SECRET", value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnv("TWILIO_VERIFY_SERVICE_SID", originalServiceSid);
  restoreEnv("TWILIO_API_KEY", originalApiKey);
  restoreEnv("TWILIO_API_SECRET", originalApiSecret);
});

describe("phone verification provider", () => {
  it("fails closed when production SMS credentials are absent", async () => {
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
    delete process.env.TWILIO_API_KEY;
    delete process.env.TWILIO_API_SECRET;

    await expect(startPhoneVerification("+97455123456")).rejects.toBeInstanceOf(PhoneVerificationUnavailableError);
  });

  it("sends and checks an E.164 number through Twilio Verify without exposing credentials", async () => {
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA_test";
    process.env.TWILIO_API_KEY = "SK_test";
    process.env.TWILIO_API_SECRET = "secret_test";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sid: "VE_test", status: "pending" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "approved" }), { status: 200 }));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(startPhoneVerification("+97455123456")).resolves.toEqual({ provider: "twilio_verify", providerReference: "VE_test" });
    await expect(confirmPhoneVerification("+97455123456", "123456")).resolves.toBe(true);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://verify.twilio.com/v2/Services/VA_test/Verifications", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://verify.twilio.com/v2/Services/VA_test/VerificationCheck", expect.objectContaining({ method: "POST" }));
    const firstBody = new URLSearchParams(fetchMock.mock.calls[0][1]?.body as string);
    const secondBody = new URLSearchParams(fetchMock.mock.calls[1][1]?.body as string);
    expect(firstBody.get("To")).toBe("+97455123456");
    expect(firstBody.get("Channel")).toBe("sms");
    expect(secondBody.get("To")).toBe("+97455123456");
    expect(secondBody.get("Code")).toBe("123456");
  });
});
