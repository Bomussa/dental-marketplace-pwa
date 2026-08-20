import { afterEach, describe, expect, it, vi } from "vitest";
import { requestSupportModelAnswer, SupportModelProviderError } from "@/lib/support-model.server";

const originalFetch = globalThis.fetch;
const request = {
  baseUrl: "https://llm.example.test/v1/",
  apiKey: "test-key",
  model: "gpt-5-mini",
  maxCompletionTokens: 500,
  systemMessage: "Use only the supplied knowledge base.",
  userMessage: "How do I compare clinics?",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("support model provider", () => {
  it("sends the bounded request and returns trimmed model text", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "  Compare the verified offers.  " } }],
    }), { status: 200 }));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(requestSupportModelAnswer(request)).resolves.toBe("Compare the verified offers.");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://llm.example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("maps a transport timeout to a controlled provider error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")) as typeof fetch;

    await expect(requestSupportModelAnswer(request)).rejects.toMatchObject({
      name: "SupportModelProviderError",
      message: "SUPPORT_MODEL_TRANSPORT_FAILED",
      causeCode: "TimeoutError",
    } satisfies Partial<SupportModelProviderError>);
  });

  it("maps an invalid successful response to a controlled provider error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })) as typeof fetch;

    await expect(requestSupportModelAnswer(request)).rejects.toMatchObject({
      name: "SupportModelProviderError",
      message: "SUPPORT_MODEL_RESPONSE_INVALID",
    } satisfies Partial<SupportModelProviderError>);
  });
});
