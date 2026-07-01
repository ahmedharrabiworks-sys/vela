import { NextRequest, NextResponse } from "next/server";

function detectFallback(desc: string): string {
  const d = desc.toLowerCase();
  if (/dental|teeth|orthodont|tooth|dentist/.test(d)) return "Dental Clinic";
  if (/medical|clinic|doctor|hospital|physician|healthcare/.test(d)) return "Medical Clinic";
  if (/cosmetic|botox|filler|aesthetic|plastic surgery/.test(d)) return "Cosmetic Clinic";
  if (/hair salon|hair cut|barber|barbershop/.test(d)) return "Hair Salon";
  if (/nail salon|nail/.test(d)) return "Nail Salon";
  if (/spa|massage|wellness|relax/.test(d)) return "Spa & Wellness";
  if (/gym|fitness|crossfit|workout/.test(d)) return "Gym & Fitness";
  if (/yoga|pilates/.test(d)) return "Yoga Studio";
  if (/physio|rehab|physiotherapy/.test(d)) return "Physiotherapy";
  if (/eye|optom|optic|lasik/.test(d)) return "Eye Clinic";
  if (/vet|veterinary|animal|pet clinic/.test(d)) return "Veterinary Clinic";
  if (/real estate|property|realtor|realty/.test(d)) return "Real Estate Agency";
  if (/restaurant|dining|cuisine/.test(d)) return "Restaurant";
  if (/cafe|coffee/.test(d)) return "Cafe";
  if (/bakery|pastry|cake/.test(d)) return "Bakery";
  if (/catering/.test(d)) return "Catering";
  if (/hotel|resort|accommodation/.test(d)) return "Hotel";
  if (/travel|tourism|visa|holiday/.test(d)) return "Travel Agency";
  if (/law|legal|attorney|lawyer|solicitor/.test(d)) return "Law Firm";
  if (/account|tax|bookkeep|audit/.test(d)) return "Accounting Firm";
  if (/marketing|digital|social media|ads/.test(d)) return "Marketing Agency";
  if (/web|software|app|tech|it support/.test(d)) return "Web Development";
  if (/school|tutor|education|lesson|class/.test(d)) return "Language School";
  if (/cleaning|maid|housekeep/.test(d)) return "Cleaning Service";
  if (/car|auto|vehicle|mechanic|repair shop/.test(d)) return "Auto Repair";
  if (/plumb|electric|handyman|hvac/.test(d)) return "Plumbing";
  if (/photo|portrait|studio/.test(d)) return "Photography Studio";
  if (/ecommerce|online store|shop/.test(d)) return "E-commerce";
  if (/insurance/.test(d)) return "Insurance Agency";
  if (/financial|invest|wealth/.test(d)) return "Financial Advisor";
  return "Consulting";
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
              "You are a business type classifier. Given a business description, respond with ONLY the business type as a short label (2-4 words max). Examples: 'Dental Clinic', 'Hair Salon', 'Real Estate Agency', 'Gym & Fitness', 'Restaurant'. Return nothing else — no punctuation, no explanation.",
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
