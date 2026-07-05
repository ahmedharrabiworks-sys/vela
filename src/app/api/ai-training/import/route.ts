import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import OpenAI from "openai";
import type { KnowledgeBase } from "@/app/api/ai-training/route";

export const dynamic = "force-dynamic";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, (m) => m.replace(/<[^>]+>/g, " "))
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&#\d+;/g, " ").replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isInstagramInput(input: string): boolean {
  const t = input.trim();
  return t.includes("instagram.com") || /^@?[\w.]{1,30}$/.test(t);
}

function normalizeUrl(raw: string): string {
  let url = raw.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
  return url;
}

const EXTRACT_SYSTEM = `You are a business data extractor. Given website text, extract structured business information.

Return ONLY a valid JSON object with this exact shape (no markdown, no explanation):
{
  "services": [{"name": "string", "price": "string", "duration": "string", "description": "string"}],
  "faqs": [{"q": "string", "a": "string"}],
  "business": {
    "hours": "string",
    "address": "string",
    "bookingPolicy": "string",
    "tone": "professional"
  },
  "extra": "string"
}

Rules:
- services: real services/products with prices when listed. Max 10 items. Use empty string for missing sub-fields.
- faqs: extract Q&A pairs or infer from the content. Max 8 items.
- business.hours: working hours if mentioned, else ""
- business.address: physical address if found, else ""
- business.bookingPolicy: cancellation, deposit, walk-in info if found, else ""
- business.tone: one of "professional" | "friendly" | "luxury" — infer from writing style
- extra: important info not captured above (brand story, unique selling points, team, promotions). Keep concise.
- If nothing useful found, return empty arrays and empty strings.`;

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({})) as { input?: string };
  const input = body.input?.trim() ?? "";
  if (!input) return NextResponse.json({ error: "input required" }, { status: 400 });

  // Instagram handle → coming soon
  if (isInstagramInput(input) && !input.startsWith("http")) {
    return NextResponse.json({ instagram: true });
  }

  const url = normalizeUrl(input);

  // Validate URL shape
  try { new URL(url); } catch {
    return NextResponse.json({ error: "Invalid URL — please enter a full website address like https://yourbusiness.com" }, { status: 400 });
  }

  // Fetch the page
  let rawHtml: string;
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VelaBot/1.0; +https://vela-g8h4.vercel.app)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      return NextResponse.json({ error: `Site returned ${resp.status} — check the URL and try again.` }, { status: 422 });
    }
    rawHtml = await resp.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const friendly = msg.includes("timeout") ? "The site took too long to respond."
      : msg.includes("ENOTFOUND") || msg.includes("getaddrinfo") ? "Couldn't reach that address — check the URL."
      : "Couldn't fetch the page — the site may block automated access.";
    return NextResponse.json({ error: friendly }, { status: 422 });
  }

  const text = stripHtml(rawHtml).slice(0, 10000);
  if (text.length < 50) {
    return NextResponse.json({ error: "Page appears to be empty or JavaScript-rendered. Try uploading a price list PDF instead." }, { status: 422 });
  }

  // GPT-4o extraction
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: EXTRACT_SYSTEM },
        { role: "user", content: `Website URL: ${url}\n\nWebsite text:\n${text}` },
      ],
      max_tokens: 1500,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let kb: KnowledgeBase;
    try {
      kb = JSON.parse(raw) as KnowledgeBase;
    } catch {
      return NextResponse.json({ error: "AI returned unexpected format — try again." }, { status: 500 });
    }

    // Validate minimal shape
    if (!Array.isArray(kb.services)) kb.services = [];
    if (!Array.isArray(kb.faqs)) kb.faqs = [];
    if (!kb.business || typeof kb.business !== "object") {
      kb.business = { hours: "", address: "", bookingPolicy: "", tone: "professional" };
    }
    if (typeof kb.extra !== "string") kb.extra = "";

    const hasData = kb.services.length > 0 || kb.faqs.length > 0
      || kb.business.hours || kb.business.address || kb.extra;

    if (!hasData) {
      return NextResponse.json({ error: "No useful business information found on that page. Try uploading a PDF or adding your details manually." }, { status: 422 });
    }

    return NextResponse.json({ kb });
  } catch (err) {
    console.error("[ai-training/import] OpenAI error:", err);
    return NextResponse.json({ error: "AI extraction failed — try again in a moment." }, { status: 500 });
  }
}
