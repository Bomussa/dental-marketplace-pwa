"use client";

import { FormEvent, useState } from "react";
import { useTranslation } from "@/components/locale-provider";
import { Button, Card, Input } from "@/components/ui";
import { SparklesIcon } from "@/components/icons";

type Message = { role: "user" | "assistant"; content: string };

export function SupportChat() {
  const { locale, t } = useTranslation();
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  function errorMessage(code?: string) {
    if (code === "AUTH_REQUIRED") return t("support.authRequired");
    if (code === "RATE_LIMITED") return t("support.rateLimited");
    if (code === "SUPPORT_NOT_CONFIGURED") return t("support.notConfigured");
    return t("support.unavailable");
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text || isPending) return;
    setError("");
    setMessage("");
    setMessages((current) => [...current, { role: "user", content: text }]);
    setIsPending(true);
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, locale, conversation_id: conversationId }),
      });
      const body = await response.json().catch(() => ({})) as { answer?: string; conversation_id?: string; error?: string };
      if (!response.ok || !body.answer) {
        setError(errorMessage(body.error));
        return;
      }
      setConversationId(body.conversation_id);
      setMessages((current) => [...current, { role: "assistant", content: body.answer! }]);
    } catch {
      setError(t("support.unavailable"));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card className="mx-auto max-w-3xl p-5 sm:p-7">
      <div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#0B5CAD]"><SparklesIcon size={21}/></span><div><h2 className="text-xl font-extrabold tracking-[-.025em]">{t("support.title")}</h2><p className="mt-1 max-w-2xl text-[.94rem] font-medium leading-7 text-slate-500">{t("support.description")}</p></div></div>
      <div className="mt-5 max-h-80 space-y-3 overflow-y-auto" aria-live="polite">
        {messages.map((entry, index) => <div key={`${entry.role}-${index}`} className={`rounded-2xl p-3.5 text-[.94rem] font-medium leading-7 ${entry.role === "user" ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-700 ring-1 ring-slate-200"}`}><span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide opacity-70">{entry.role === "user" ? (locale === "ar" ? "أنت" : "You") : t("support.title")}</span>{entry.content}</div>)}
      </div>
      {error && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">{error}</p>}
      <form onSubmit={send} className="mt-5 flex gap-2"><Input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} required placeholder={t("support.placeholder")} aria-label={t("support.placeholder")}/><Button type="submit" disabled={isPending}>{isPending ? t("support.sending") : t("support.send")}</Button></form>
    </Card>
  );
}
