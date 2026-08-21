import { NextResponse } from "next/server";
import type { Json } from "@/lib/database.types";
import {
  publicWriteRequestBodyIsTooLarge,
  publicWriteRequestOriginIsAllowed,
  readPublicWriteRequestTextWithinLimit,
} from "@/lib/public-write-request-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { supportMessageSchema } from "@/lib/validation";
import { consumeRateLimit, withOperationalTimeout } from "@/lib/operations.server";
import { requestSupportModelAnswer } from "@/lib/support-model.server";

const MEDICAL_OR_EMERGENCY = /(?:ألم شديد|نزيف|تورم|عدوى|طارئ|emergency|severe pain|bleeding|swelling|infection)/i;
const MAX_SUPPORT_MESSAGE_BYTES = 16 * 1024;

type SafetyCategory = "standard" | "medical" | "emergency" | "privacy" | "billing" | "abuse";
type KnowledgeArticle = { slug: string; title: string; body_markdown: string; category: string };

function safetyReply(locale: "ar" | "en", category: SafetyCategory) {
  if (category === "emergency") {
    return locale === "ar"
      ? "إذا كانت لديك حالة طارئة أو نزيف شديد أو صعوبة في التنفس، اطلب الرعاية الطارئة فورًا. لا يستطيع هذا المساعد تقييم الحالة أو تقديم علاج طبي."
      : "If you have an emergency, severe bleeding, or difficulty breathing, seek emergency care immediately. This assistant cannot assess the condition or provide medical treatment.";
  }
  return locale === "ar"
    ? "أنا مساعد للمنصة ولست مختصًا طبيًا. أستطيع المساعدة في الحجز والأسعار والتوفر والحسابات، لكن لا أستطيع تشخيص الأعراض أو اقتراح علاج؛ يرجى التواصل مع طبيب أسنان مؤهل بشأن أي عرض صحي."
    : "I am a platform assistant, not a medical professional. I can help with booking, prices, availability, and accounts, but I cannot diagnose symptoms or recommend treatment; please consult a qualified dentist for health concerns.";
}

export async function POST(request: Request) {
  try {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await withOperationalTimeout(supabase.auth.getClaims()).catch(() => ({ data: null, error: new Error("OPERATION_TIMEOUT") }));
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  if (!publicWriteRequestOriginIsAllowed(request)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: { "cache-control": "no-store" } });
  if (publicWriteRequestBodyIsTooLarge(request, MAX_SUPPORT_MESSAGE_BYTES)) {
    return NextResponse.json({ error: "support_message_too_large" }, { status: 413, headers: { "cache-control": "no-store" } });
  }

  const raw = await readPublicWriteRequestTextWithinLimit(request, MAX_SUPPORT_MESSAGE_BYTES).catch(() => "");
  if (raw === null) return NextResponse.json({ error: "support_message_too_large" }, { status: 413, headers: { "cache-control": "no-store" } });

  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  const parsed = supportMessageSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });

  const category: SafetyCategory = MEDICAL_OR_EMERGENCY.test(parsed.data.message)
    ? (/طارئ|emergency|نزيف شديد|severe bleeding|صعوبة.*تنفس|difficulty breathing/i.test(parsed.data.message) ? "emergency" : "medical")
    : "standard";

  let supportRateAllowed;
  try {
    supportRateAllowed = await consumeRateLimit({
      scope: "support_message",
      subject: userId,
      maxRequests: 30,
      windowSeconds: 60 * 60,
    });
  } catch {
    return NextResponse.json({ error: "RATE_LIMIT_UNAVAILABLE" }, { status: 503 });
  }
  if (!supportRateAllowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED" },
      { status: 429, headers: { "retry-after": "3600", "cache-control": "no-store" } },
    );
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "SUPPORT_UNAVAILABLE" }, { status: 503 });
  }

  let approvedArticles: KnowledgeArticle[] = [];
  let configuredBaseUrl = "";
  let configuredApiKey = "";

  if (category === "standard") {
    const { data: articles, error: articleError } = await withOperationalTimeout(
      admin
        .from("support_knowledge_articles")
        .select("slug,title,body_markdown,category")
        .eq("locale", parsed.data.locale)
        .eq("audience", "public")
        .eq("status", "approved")
        .order("updated_at", { ascending: false })
        .limit(8),
    );
    if (articleError) return NextResponse.json({ error: "KNOWLEDGE_UNAVAILABLE" }, { status: 503 });

    approvedArticles = (articles ?? []) as KnowledgeArticle[];
    if (approvedArticles.length === 0) {
      // No approved source means no model invocation. This prevents the model
      // from turning general knowledge or prompt text into an invented platform policy.
      return NextResponse.json({ error: "SUPPORT_KNOWLEDGE_NOT_CONFIGURED" }, { status: 503 });
    }

    const baseUrl = process.env.OPENAI_API_BASE;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!baseUrl || !apiKey) return NextResponse.json({ error: "SUPPORT_NOT_CONFIGURED" }, { status: 503 });
    configuredBaseUrl = baseUrl;
    configuredApiKey = apiKey;
  }

  let conversationId = parsed.data.conversation_id;
  if (conversationId) {
    const { data: existingConversation, error } = await withOperationalTimeout(admin.from("support_conversations").select("id,status").eq("id", conversationId).eq("user_id", userId).maybeSingle());
    if (error) return NextResponse.json({ error: "CONVERSATION_UNAVAILABLE" }, { status: 503 });
    if (!existingConversation || existingConversation.status !== "open") return NextResponse.json({ error: "CONVERSATION_NOT_OPEN" }, { status: 409 });
  } else {
    const { data: createdConversation, error } = await withOperationalTimeout(admin.from("support_conversations").insert({ user_id: userId, locale: parsed.data.locale, status: "open", safety_category: "standard" }).select("id").single());
    if (error || !createdConversation) return NextResponse.json({ error: "CONVERSATION_UNAVAILABLE" }, { status: 503 });
    conversationId = createdConversation.id;
  }
  const resolvedConversationId = conversationId;
  if (!resolvedConversationId) return NextResponse.json({ error: "CONVERSATION_UNAVAILABLE" }, { status: 503 });

  const { error: userMessageError } = await withOperationalTimeout(admin.from("support_messages").insert({ conversation_id: resolvedConversationId, role: "user", content: parsed.data.message, safety_category: category, sources: [] }));
  if (userMessageError) return NextResponse.json({ error: "MESSAGE_NOT_RECORDED" }, { status: 503 });

  let answer = "";
  let sourceTitles: string[] = [];
  if (category !== "standard") {
    answer = safetyReply(parsed.data.locale, category);
    const { error: safetyUpdateError } = await withOperationalTimeout(admin.from("support_conversations").update({ safety_category: category, escalation_reason: category === "emergency" ? "medical_emergency_keyword" : "medical_question" }).eq("id", resolvedConversationId));
    if (safetyUpdateError) return NextResponse.json({ error: "CONVERSATION_UNAVAILABLE" }, { status: 503 });
  } else {
    const knowledge = approvedArticles.map((article) => `# ${article.title}\n${article.body_markdown.slice(0, 1800)}`).join("\n\n");
    sourceTitles = approvedArticles.map((article) => article.title);

    const system = parsed.data.locale === "ar"
      ? "أنت مساعد خدمة عملاء لمنصة أسناني قطر. أجب بالعربية فقط. استخدم قاعدة المعرفة أدناه فقط لحقائق المنصة. ساعد في الحجز والأسعار والتوفر والحساب والخصوصية فقط. لا تقدّم تشخيصًا أو علاجًا طبيًا، ولا تخترع سعرًا أو موعدًا أو سياسة. إذا لم تجد الإجابة في قاعدة المعرفة فاذكر ذلك بوضوح واقترح التواصل مع فريق الدعم. اجعل الإجابة موجزة وعملية."
      : "You are the customer support assistant for Asnani Qatar. Answer only in English. Use only the knowledge base below for platform facts. Help only with booking, prices, availability, accounts, and privacy. Do not diagnose or recommend medical treatment, and never invent a price, appointment, or policy. If the answer is not in the knowledge base, say so clearly and suggest contacting support. Keep the answer concise and practical.";

    try {
      answer = await requestSupportModelAnswer({
        baseUrl: configuredBaseUrl,
        apiKey: configuredApiKey,
        model: "gpt-5-mini",
        maxCompletionTokens: 500,
        systemMessage: `${system}\n\nقاعدة المعرفة / Knowledge base:\n${knowledge}`,
        userMessage: parsed.data.message,
      });
    } catch (modelError) {
      console.error("support_model_failed", { code: modelError instanceof Error ? modelError.message : "UNKNOWN" });
      return NextResponse.json({ error: "SUPPORT_UNAVAILABLE" }, { status: 503 });
    }

    if (!answer) answer = parsed.data.locale === "ar" ? "لا أستطيع صياغة إجابة موثوقة الآن. يرجى المحاولة لاحقًا أو التواصل مع فريق الدعم." : "I cannot produce a reliable answer right now. Please try again later or contact support.";
  }

  const sources: Json = sourceTitles.map((title) => ({ title }));
  const { error: assistantMessageError } = await withOperationalTimeout(admin.from("support_messages").insert({
    conversation_id: resolvedConversationId,
    role: "assistant",
    content: answer,
    policy_version: "support-governance-v1",
    safety_category: category,
    confidence: category === "standard" ? 0.7 : 1,
    sources,
  }));
  if (assistantMessageError) return NextResponse.json({ error: "RESPONSE_NOT_RECORDED" }, { status: 503 });

  return NextResponse.json({ conversation_id: resolvedConversationId, answer, safety_category: category, sources: sourceTitles }, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("support_storage_or_timeout_failed", { code: error instanceof Error ? error.message : "UNKNOWN" });
    return NextResponse.json({ error: "SUPPORT_UNAVAILABLE" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
