/**
 * "Suggested knowledge": facts noticed in conversations, calls or the owner
 * assistant chat, queued for the owner to approve or reject. Nothing here
 * ever writes to the knowledge base. Customer personal data is masked before
 * the text leaves the server and any candidate that still looks personal is
 * dropped. Never throws: this must not break the flow it is attached to, and
 * it does nothing until migration_v41.sql has run.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadKnowledgeBase } from "@/lib/knowledge-base-server";

export type SuggestionSource = "conversation" | "call" | "assistant";

const DAILY_CAP_PER_TENANT = 20;
const MAX_FACTS_PER_CALL = 3;

const FACT_SIGNAL_EN = /\b(open|opens|closed|close|closes|closing|hours?|holidays?|price|prices|pricing|cost|costs|qar|riyals?|discount|offer|address|located|moved|branch|parking|policy|deposit|cancel\w*)\b/i;
const FACT_SIGNAL_AR = /مفتوح|فاتح|مسكر|مغلق|نسكر|نفتح|دوام|إجازة|اجازة|سعر|أسعار|اسعار|ريال|خصم|عرض|عنوان|موقع|فرع|مواقف|سياسة|عربون|إلغاء|الغاء/;

/** Free check that decides whether the text is worth an AI call at all. */
export function mayContainBusinessFact(text: string): boolean {
  return FACT_SIGNAL_EN.test(text) || FACT_SIGNAL_AR.test(text);
}

/** Removes phone numbers, emails and links before text is analyzed. */
export function maskContactDetails(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[hidden]")
    .replace(/https?:\/\/\S+/g, "[hidden]")
    .replace(/\+?\d[\d\s().-]{6,}\d/g, "[hidden]");
}

const PERSONAL_EN = /\b(my (name|number|phone|wife|husband|son|daughter|appointment|email)|i am|i'm|called|booked|paid|wants|asked|complained|visited)\b/i;
const PERSONAL_AR = /اسمي|رقمي|زوجتي|زوجي|ولدي|بنتي|موعدي|اتصل|حجز|دفع|يبي|تبي|اشتكى/;

/** True only for a short, general statement with nothing about a person in it. */
export function isSafeFact(fact: string, blockedNames: string[] = []): boolean {
  const f = fact.trim();
  if (f.length < 8 || f.length > 220) return false;
  if (/@|https?:|\[hidden\]/i.test(f) || /\d[\d\s().-]{6,}\d/.test(f)) return false;
  if (PERSONAL_EN.test(f) || PERSONAL_AR.test(f)) return false;
  const lower = f.toLowerCase();
  return !blockedNames.some((n) => n.trim().length > 2 && lower.includes(n.trim().toLowerCase()));
}

export function factKey(fact: string): string {
  return fact.toLowerCase().replace(/[\s.,;:!?'"()،؛؟-]+/g, " ").trim().slice(0, 180);
}

export interface CleanFact {
  kind: "note" | "price";
  fact: string;
  service_name: string | null;
  price: string | null;
}

/** Turns the model's raw output into safe, well-formed candidates. */
export function parseExtractedFacts(raw: string, blockedNames: string[] = []): CleanFact[] {
  let list: unknown;
  try { list = (JSON.parse(raw) as { facts?: unknown }).facts; } catch { return []; }
  if (!Array.isArray(list)) return [];
  const out: CleanFact[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const fact = typeof r.fact === "string" ? r.fact.trim() : "";
    if (!isSafeFact(fact, blockedNames)) continue;
    const name = typeof r.service === "string" ? r.service.trim() : "";
    const price = typeof r.price === "string" ? r.price.trim() : "";
    const isPrice = r.kind === "price" && !!name && name.length <= 80 && /\d/.test(price) && price.length <= 40;
    out.push({ kind: isPrice ? "price" : "note", fact, service_name: isPrice ? name : null, price: isPrice ? price : null });
    if (out.length >= MAX_FACTS_PER_CALL) break;
  }
  return out;
}

const SYSTEM = `You find new facts about a business in a short piece of text, for its owner to review.
Return only JSON: {"facts":[{"kind":"note"|"price","fact":"one short sentence","service":"","price":""}]}.
A fact is a lasting general statement about the business: opening hours, closed days, a price, a service offered, its address, a policy.
Use kind "price" with "service" and "price" when it states the price of one service.
Never include anything about a customer or any individual: no names, phone numbers, health details, bookings or complaints.
Ignore questions, guesses, one-off events, and anything already in KNOWN.
Write each fact in the language of the text. If there is nothing, return {"facts":[]}.`;

export async function suggestKnowledge(
  admin: any,
  p: { tenantId: string; source: SuggestionSource; text: string; blockedNames?: string[] },
): Promise<number> {
  try {
    const text = maskContactDetails(p.text).slice(0, 4000).trim();
    if (!text || !mayContainBusinessFact(text)) return 0;
    const key = process.env.OPENAI_API_KEY;
    if (!key) return 0;

    // Also proves the table exists, before any AI spend.
    const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
    const { count, error: countErr } = await admin.from("knowledge_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", p.tenantId).gte("created_at", dayStart.toISOString());
    if (countErr || (count ?? 0) >= DAILY_CAP_PER_TENANT) return 0;

    const kb = await loadKnowledgeBase(admin, p.tenantId);
    const known = JSON.stringify({ services: kb.services.map((s) => [s.name, s.price]), business: kb.business, notes: kb.extra.slice(0, 1200) });

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0,
        max_tokens: 300,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: `KNOWN: ${known}\n\nTEXT:\n${text}` }],
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) { console.warn("[knowledge-suggestions] extraction failed:", res.status); return 0; }
    const j = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const facts = parseExtractedFacts(j.choices?.[0]?.message?.content ?? "", p.blockedNames);
    if (facts.length === 0) return 0;

    // The unique key means a fact the owner already rejected is never suggested again.
    const { error } = await admin.from("knowledge_suggestions").upsert(
      facts.map((f) => ({ tenant_id: p.tenantId, source: p.source, fact_key: factKey(f.fact), ...f })),
      { onConflict: "tenant_id,fact_key", ignoreDuplicates: true },
    );
    if (error) { console.warn("[knowledge-suggestions] save failed:", error.message); return 0; }
    return facts.length;
  } catch (err) {
    console.warn("[knowledge-suggestions] skipped:", (err as Error)?.name);
    return 0;
  }
}
