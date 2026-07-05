import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

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

  // Image → GPT-4o vision transcription
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mime};base64,${base64}`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text and information from this image that would be useful for a business AI assistant (services, prices, hours, FAQs, policies, contact info). Format clearly.",
            },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      max_tokens: 1500,
    });

    const text = result.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[ai-training/upload] OpenAI error:", err);
    return NextResponse.json({ error: "Image extraction failed" }, { status: 500 });
  }
}
