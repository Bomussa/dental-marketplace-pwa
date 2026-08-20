import "server-only";

type TwilioVerificationResponse = {
  sid?: string;
  status?: string;
  message?: string;
  code?: number;
};

export class PhoneVerificationUnavailableError extends Error {
  constructor() {
    super("PHONE_VERIFICATION_UNAVAILABLE");
  }
}

export class PhoneVerificationProviderError extends Error {
  constructor() {
    super("PHONE_VERIFICATION_PROVIDER_ERROR");
  }
}

function twilioConfig() {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;
  if (!serviceSid || !apiKey || !apiSecret) throw new PhoneVerificationUnavailableError();
  return { serviceSid, apiKey, apiSecret };
}

export function ensurePhoneVerificationAvailable() {
  twilioConfig();
}

function authorization(apiKey: string, apiSecret: string) {
  return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;
}

async function requestTwilioVerify(path: string, params: URLSearchParams) {
  const { serviceSid, apiKey, apiSecret } = twilioConfig();
  const response = await fetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/${path}`, {
    method: "POST",
    headers: {
      authorization: authorization(apiKey, apiSecret),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as TwilioVerificationResponse;
  if (!response.ok) throw new PhoneVerificationProviderError();
  return payload;
}

export async function startPhoneVerification(phone: string) {
  const payload = await requestTwilioVerify("Verifications", new URLSearchParams({ To: phone, Channel: "sms" }));
  if (payload.status !== "pending" || !payload.sid) throw new PhoneVerificationProviderError();
  return { provider: "twilio_verify", providerReference: payload.sid };
}

export async function confirmPhoneVerification(phone: string, code: string) {
  const payload = await requestTwilioVerify("VerificationCheck", new URLSearchParams({ To: phone, Code: code }));
  return payload.status === "approved";
}
