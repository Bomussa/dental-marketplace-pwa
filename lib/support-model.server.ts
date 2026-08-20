export const SUPPORT_MODEL_TIMEOUT_MS = 15_000;

export class SupportModelProviderError extends Error {
  constructor(message: string, readonly causeCode?: string) {
    super(message);
    this.name = "SupportModelProviderError";
  }
}

type SupportModelRequest = {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxCompletionTokens: number;
  systemMessage: string;
  userMessage: string;
};

function normalizeSupportModelText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 5000) : "";
}

export async function requestSupportModelAnswer({
  baseUrl,
  apiKey,
  model,
  maxCompletionTokens,
  systemMessage,
  userMessage,
}: SupportModelRequest) {
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_completion_tokens: maxCompletionTokens,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
      }),
      signal: AbortSignal.timeout(SUPPORT_MODEL_TIMEOUT_MS),
    });
  } catch (error) {
    throw new SupportModelProviderError("SUPPORT_MODEL_TRANSPORT_FAILED", error instanceof Error ? error.name : "UNKNOWN");
  }

  if (!response.ok) throw new SupportModelProviderError(`SUPPORT_MODEL_${response.status}`);

  try {
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    return normalizeSupportModelText(payload.choices?.[0]?.message?.content);
  } catch (error) {
    throw new SupportModelProviderError("SUPPORT_MODEL_RESPONSE_INVALID", error instanceof Error ? error.name : "UNKNOWN");
  }
}
