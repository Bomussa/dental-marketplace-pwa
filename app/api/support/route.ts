import { NextResponse } from "next/server";
import type { Json } from "@/lib/database.types";
import {
  publicWriteRequestBodyIsTooLarge,
  publicWriteRequestClientKey,
  publicWriteRequestOriginIsAllowed,
  readPublicWriteRequestTextWithinLimit,
} from "@/lib/public-write-request-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { supportMessageSchema } from "@/lib/validation";
import { consumeRateLimit, withOperationalTimeout } from "@/lib/operations.server";
import { requestSupportModelAnswer } from "@/lib/support-model.server";
import { getPublicSupportFallback } from "@/lib/support-public-fallback";

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

function supportSystemPrompt(locale: "ar" | "en") {
  return locale === "ar"
    ? "أنت مساعد الاستفسارات العامة لمنصة أسناني قطر. أجب بالعربية فقط. استخدم قاعدة المعرفة أدناه فقط لحقائق المنصة. ساعد في الحجز والأسعار المنشورة والتوفر والحساب والخصوصية فقط. لا تقدّم تشخيصًا أو علاجًا طبيًا، ولا تخترع سعرًا أو موعدًا أو سياسة. لا تطلب كلمة مرور أو رقمًا شخصيًا أو تفاصيل صحية. إذا كان السؤال يتطلب بيانات حساب أو حجز محدد، اشرح أن تسجيل الدخول مطلوب. إذا لم تجد الإجابة في قاعدة المعرفة فاذكر ذلك بوضوح واجعل الإجابة موجزة وعملية."
    : "You are the public support assistant for Asnani Qatar. Answer only in English. Use only the knowledge base below for platform facts. Help only with booking, published pricing, availability, accounts, and privacy. Do not diagnose or recommend medical treatment, and never invent a price, appointment, or policy. Do not request passwords, national identifiers, or health details. Explain that sign-in is required for a specific booking or account question. If the answer is not in the knowledge base, say so clearly and keep the answer concise and practical.";
}

export async function POST(request: Request) {
  if (!publicWriteRequestOriginIsAllowed(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: { "cache-control": "no-store" } });
  }
  if (publicWriteRequestBodyIsTooLarge(request, MAX_SUPPORT_MESSAGE_BYTES)) {
    return NextResponse.json({ error: "support_message_too_large" }, { status: 413, headers: { "cache-control": "no-store" } });
  }

  try {
    const raw = await readPublicWriteRequestTextWithinLimit(request, MAX_SUPPORT_MESSAGE_BYTES).catch(() => "");
    if (raw === null) return NextResponse.json({ error: "support_message_too_large" }, { status: 413, headers: { "cache-control": "no-store" } });

    let payload: unknown = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400, headers: { "cache-control": "no-store" } });
    }

    const parsed = supportMessageSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400, headers: { "cache-control": "no-store" } });

    const supabase = await createClient();
    const { data: claimsData } = await withOperationalTimeout(supabase.auth.getClaims()).catch(() => ({ data: null }));
    const userId = claimsData?.claims?.sub;
    const authenticated = typeof userId === "string";
    const category: SafetyCategory = MEDICAL_OR_EMERGENCY.test(parsed.data.message)
      ? (/طارئ|emergency|نزيف شديد|severe bleeding|صعوبة.*تنفس|difficulty breathing/i.test(parsed.data.message) ? "emergency" : "medical")
      : "standard";

    const supportRateAllowed = await consumeRateLimit({
      scope: "support_message",
      subject: authenticated ? userId : `guest:${publicWriteRequestClientKey(request)}`,
      maxRequests: authenticated ? 30 : 10,
      windowSeconds: authenticated ? 60 * 60 : 15 * 60,
    }).catch(() => false);
    if (!supportRateAllowed) {
      return NextResponse.json(
        { error: "RATE_LIMITED" },
        { status: 429, headers: { "retry-after": authenticated ? "3600" : "900", "cache-control": "no-store" } },
      );
    }

    let admin: ReturnType<typeof createAdminClient> | null = null;
    try {
      admin = createAdminClient();
    } catch {
      // Public chat keeps a safe local fallback when the managed data path is temporarily unavailable.
    }

    let answer = "";
    let sourceTitles: string[] = [];
    if (category !== "standard") {
      answer = safetyReply(parsed.data.locale, category);
      sourceTitles = [parsed.data.locale === "ar" ? "حدود السلامة الطبية" : "Medical safety boundary"];
    } else {
      const fallback = getPublicSupportFallback(parsed.data.locale, parsed.data.message);
      answer = fallback.answer;
      sourceTitles = fallback.sources;

      if (admin) {
        const { data: articles, error: articleError } = await withOperationalTimeout(
          admin
            .from("support_knowledge_articles")
            .select("slug,title,body_markdown,category")
            .eq("locale", parsed.data.locale)
            .eq("audience", "public")
            .eq("status", "approved")
            .order("updated_at", { ascending: false })
            .limit(8),
        ).catch(() => ({ data: null, error: new Error("SUPPORT_KNOWLEDGE_UNAVAILABLE") }));

        const approvedArticles = articleError ? [] : (articles ?? []) as KnowledgeArticle[];
        const baseUrl = process.env.OPENAI_API_BASE;
        const apiKey = process.env.OPENAI_API_KEY;
        if (approvedArticles.length > 0 && baseUrl && apiKey) {
          const knowledge = approvedArticles.map((article) => `# ${article.title}\n${article.body_markdown.slice(0, 1800)}`).join("\n\n");
          try {
            const modelAnswer = await requestSupportModelAnswer({
              baseUrl,
              apiKey,
              model: "gpt-5-mini",
              maxCompletionTokens: 500,
              systemMessage: `${supportSystemPrompt(parsed.data.locale)}\n\nقاعدة المعرفة / Knowledge base:\n${knowledge}`,
              userMessage: parsed.data.message,
            });
            if (modelAnswer) {
              answer = modelAnswer;
              sourceTitles = approvedArticles.map((article) => article.title);
            }
          } catch (modelError) {
            console.warn("support_model_fallback", { code: modelError instanceof Error ? modelError.message : "UNKNOWN" });
          }
        }
      }
    }

    // Guests receive a fully functional answer without creating a database record.
    // Private conversations remain persisted and owned only by the authenticated user.
    if (!authenticated || !admin) {
      return NextResponse.json(
        { answer, safety_category: category, sources: sourceTitles, access: "public" },
        { status: 200, headers: { "cache-control": "no-store" } },
      );
    }

    let conversationId = parsed.data.conversation_id;
    if (conversationId) {
      const { data: existingConversation, error } = await withOperationalTimeout(
        admin.from("support_conversations").select("id,status").eq("id", conversationId).eq("user_id", userId).maybeSingle(),
      );
      if (error) return NextResponse.json({ error: "CONVERSATION_UNAVAILABLE" }, { status: 503, headers: { "cache-control": "no-store" } });
      if (!existingConversation || existingConversation.status !== "open") return NextResponse.json({ error: "CONVERSATION_NOT_OPEN" }, { status: 409, headers: { "cache-control": "no-store" } });
    } else {
      const { data: createdConversation, error } = await withOperationalTimeout(
        admin.from("support_conversations").insert({ user_id: userId, locale: parsed.data.locale, status: "open", safety_category: "standard" }).select("id").single(),
      );
      if (error || !createdConversation) return NextResponse.json({ error: "CONVERSATION_UNAVAILABLE" }, { status: 503, headers: { "cache-control": "no-store" } });
      conversationId = createdConversation.id;
    }
    if (!conversationId) return NextResponse.json({ error: "CONVERSATION_UNAVAILABLE" }, { status: 503, headers: { "cache-control": "no-store" } });

    const { error: userMessageError } = await withOperationalTimeout(
      admin.from("support_messages").insert({ conversation_id: conversationId, role: "user", content: parsed.data.message, safety_category: category, sources: [] }),
    );
    if (userMessageError) return NextResponse.json({ error: "MESSAGE_NOT_RECORDED" }, { status: 503, headers: { "cache-control": "no-store" } });

    if (category !== "standard") {
      const { error: safetyUpdateError } = await withOperationalTimeout(
        admin.from("support_conversations").update({ safety_category: category, escalation_reason: category === "emergency" ? "medical_emergency_keyword" : "medical_question" }).eq("id", conversationId),
      );
      if (safetyUpdateError) return NextResponse.json({ error: "CONVERSATION_UNAVAILABLE" }, { status: 503, headers: { "cache-control": "no-store" } });
    }

    const sources: Json = sourceTitles.map((title) => ({ title }));
    const { error: assistantMessageError } = await withOperationalTimeout(admin.from("support_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: answer,
      policy_version: "support-governance-v2",
      safety_category: category,
      confidence: category === "standard" ? 0.7 : 1,
      sources,
    }));
    if (assistantMessageError) return NextResponse.json({ error: "RESPONSE_NOT_RECORDED" }, { status: 503, headers: { "cache-control": "no-store" } });

    return NextResponse.json(
      { conversation_id: conversationId, answer, safety_category: category, sources: sourceTitles, access: "private" },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("support_request_failed", { code: error instanceof Error ? error.message : "UNKNOWN" });
    return NextResponse.json({ error: "SUPPORT_UNAVAILABLE" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
