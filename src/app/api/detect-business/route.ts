import { NextRequest, NextResponse } from "next/server";

function detectFallback(desc: string): string {
  const d = desc.toLowerCase();
  if (/ecommerce|e-commerce|online store|dropshipping|sell online|products/.test(d)) return "E-Commerce";
  if (/coffee|cafe|brew|espresso|latte/.test(d)) return "Coffee Shop";
  if (/restaurant|food|eat|dining|cuisine|burger|pizza|menu|takeaway/.test(d)) return "Restaurant";
  if (/hotel|accommodation|stay|resort|inn|motel/.test(d)) return "Hotel";
  if (/dental|teeth|orthodont|tooth|dentist|medical|clinic|doctor|hospital|physician|healthcare|health/.test(d)) return "Medical Clinic";
  if (/hair|salon|beauty|nail|spa|massage|barber|barbershop|wellness/.test(d)) return "Beauty & Wellness";
  if (/gym|fitness|sport|yoga|pilates|training|workout|crossfit|personal trainer/.test(d)) return "Gym & Fitness";
  if (/real estate|property|rent|apartment|villa|realtor|realty/.test(d)) return "Real Estate";
  if (/law|legal|attorney|lawyer|solicitor/.test(d)) return "Law Firm";
  if (/school|tutor|education|academy|learning|lesson|class|course/.test(d)) return "Education";
  return "Other";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const description: string = body?.description ?? "";

  if (!description.trim()) {
    return NextResponse.json({ type: "" });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ type: detectFallback(description) });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a business type classifier. Given a business description, respond with ONLY one of these exact labels (copy it exactly):\nDental Clinic\nMedical Clinic\nHair Salon\nGym & Fitness\nReal Estate Agency\nRestaurant\nCoffee Shop\nHotel\nLaw Firm\nEducation\nE-Commerce\nBeauty & Wellness\nCar Dealership\nOther\n\nPick the single best match. If none fits clearly, respond with exactly: Other\nReturn ONLY the label. No punctuation, no explanation.",
          },
          { role: "user", content: description },
        ],
        max_tokens: 20,
        temperature: 0,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ type: detectFallback(description) });
    }

    const data = await res.json();
    const type =
      data.choices?.[0]?.message?.content?.trim() ||
      detectFallback(description);
    return NextResponse.json({ type });
  } catch {
    return NextResponse.json({ type: detectFallback(description) });
  }
}
