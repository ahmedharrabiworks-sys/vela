import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import OpenAI from "openai";
import type { KnowledgeBase } from "@/app/api/ai-training/route";

export const dynamic = "force-dynamic";

// FIX 7 (round M): real root cause of "image paste -> extract services ->
// save" never actually landing -- the image branch below extracted real
// text via GPT-4o vision correctly (that part always worked), but only
// ever returned a raw text blob, which the client just appended to the
// free-text "extra" field. A pasted price list never became real,
// structured kb.services entries (name/price pairs the rest of the app --
// the customer-facing AI's services list, the Services tab UI -- actually
// reads from). Same structured-JSON extraction shape and prompt style as
// the proven text/URL import path (see ai-training/import/route.ts),
// adapted for a vision call instead of a text completion.
const IMAGE_EXTRACT_SYSTEM = `You are a business data extractor looking at an image (a price list, menu, or business document). Extract structured business information visible in the image.

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
- services: real services/products with prices actually visible in the image. Max 15 items. Use empty string for missing sub-fields. Never invent a service or price not genuinely shown.
- faqs: only if genuinely visible as Q&A content. Max 8 items.
- business.hours/address/bookingPolicy: only if genuinely visible in the image, else ""
- business.tone: one of "professional" | "friendly" | "luxury" -- infer from the image's visual style
- extra: any other useful text visible in the image not captured above (concise)
- If the image contains no useful business information at all, return empty arrays and empty strings.`;

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const maxBytes = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  const mime = file.type.toLowerCase();
  const isPdf = mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = mime.startsWith("image/");

  if (!isPdf && !isImage) {
    return NextResponse.json({ error: "Only PDF and image files are supported" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (isPdf) {
    try {
      // Dynamic import avoids webpack bundling issues
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      const text = data.text?.trim() ?? "";
      if (!text) {
        return NextResponse.json({ error: "Could not extract text from PDF (may be image-based)" }, { status: 422 });
      }
      return NextResponse.json({ text: text.slice(0, 8000) });
    } catch (err) {
      console.error("[ai-training/upload] pdf-parse error:", err);
      return NextResponse.json({ error: "PDF processing failed" }, { status: 500 });
    }
  }

  // Image → GPT-4o vision, structured extraction (see IMAGE_EXTRACT_SYSTEM above)
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mime};base64,${base64}`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: IMAGE_EXTRACT_SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the structured business information visible in this image." },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const raw = result.choices[0]?.message?.content ?? "{}";
    let kb: KnowledgeBase;
    try {
      kb = JSON.parse(raw) as KnowledgeBase;
    } catch {
      return NextResponse.json({ error: "AI returned unexpected format. Try again." }, { status: 500 });
    }
    if (!Array.isArray(kb.services)) kb.services = [];
    if (!Array.isArray(kb.faqs)) kb.faqs = [];
    if (!kb.business || typeof kb.business !== "object") {
      kb.business = { hours: "", address: "", bookingPolicy: "", tone: "professional" };
    }
    if (typeof kb.extra !== "string") kb.extra = "";

    const hasData = kb.services.length > 0 || kb.faqs.length > 0
      || kb.business.hours || kb.business.address || kb.extra;
    if (!hasData) {
      return NextResponse.json({ error: "No useful business information found in that image. Try a clearer photo or a different file." }, { status: 422 });
    }

    return NextResponse.json({ kb });
  } catch (err) {
    console.error("[ai-training/upload] OpenAI error:", err);
    return NextResponse.json({ error: "Image extraction failed" }, { status: 500 });
  }
}
