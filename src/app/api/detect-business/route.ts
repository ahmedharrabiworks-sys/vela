import { NextRequest, NextResponse } from "next/server";

// Security audit Part 1: this route is public, unauthenticated, and calls
// OpenAI on every non-empty description with zero rate limiting -- a
// scriptable, unlimited real-cost drain (unlike the debounced 1/sec a real
// user typing in the signup form ever triggers). Same in-memory per-IP
// sliding-window pattern used in auth/signup/route.ts.
const DETECT_RATE_MAP = new Map<string, { count: number; windowStart: number }>();
const DETECT_RATE_LIMIT = 20;
const DETECT_WINDOW_MS  = 60_000;

function isDetectRateLimited(ip: string): boolean {
  const now   = Date.now();
  const entry = DETECT_RATE_MAP.get(ip);
  if (!entry || now - entry.windowStart >= DETECT_WINDOW_MS) {
    DETECT_RATE_MAP.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= DETECT_RATE_LIMIT) return true;
  entry.count++;
  return false;
}

function detectFallback(desc: string): string {
  const d = desc.toLowerCase();
  if (/ecommerce|e-commerce|online store|dropshipping|sell online/.test(d)) return "E-Commerce";
  if (/coffee|cafe|brew|espresso|latte/.test(d)) return "Coffee Shop";
  if (/restaurant|food|dining|cuisine|burger|pizza|takeaway|takeout/.test(d)) return "Restaurant";
  if (/hotel|accommodation|resort|inn|motel|hostel/.test(d)) return "Hotel";
  if (/dental|teeth|orthodont|dentist/.test(d)) return "Dental Clinic";
  if (/medical|clinic|doctor|hospital|physician|healthcare/.test(d)) return "Medical Clinic";
  if (/barber|barbershop|men.*hair/.test(d)) return "Barbershop";
  if (/spa|massage|wellbeing|wellness/.test(d)) return "Spa & Massage";
  if (/hair|salon|beauty|nail|blow/.test(d)) return "Hair Salon";
  if (/gym|fitness|sport|yoga|pilates|workout|crossfit|personal trainer/.test(d)) return "Gym & Fitness";
  if (/real estate|property|rent|apartment|villa|realtor|realty/.test(d)) return "Real Estate";
  if (/law|legal|attorney|lawyer|solicitor/.test(d)) return "Law Firm";
  if (/tutor|tutoring|school|education|academy|learning|lesson|class|course/.test(d)) return "Education & Tutoring";
  if (/car dealer|dealership|automotiv|vehicle sales/.test(d)) return "Car Dealership";
  if (/auto repair|garage|mechanic|car service/.test(d)) return "Auto Repair";
  if (/interior design|interior decor|furniture|home design/.test(d)) return "Interior Design";
  if (/photo|photographer|photography|studio portrait/.test(d)) return "Photography Studio";
  if (/marketing agency|digital marketing|advertising agency|social media agency/.test(d)) return "Marketing Agency";
  if (/cleaning|maid|janitorial|housekeeping/.test(d)) return "Cleaning Services";
  if (/travel agency|travel agent|tour operator|holiday package/.test(d)) return "Travel Agency";
  if (/event|wedding planner|event planning|conference organizer/.test(d)) return "Event Planning";
  if (/pet|veterinary|vet|grooming|dog training/.test(d)) return "Pet Services";
  if (/construction|contracting|builder|renovation|fitout/.test(d)) return "Construction";
  if (/accounting|accountant|bookkeeping|audit|tax advisor|cpa/.test(d)) return "Accounting & Finance";
  if (/recruitment|hr agency|headhunt|staffing|hiring agency/.test(d)) return "Recruitment";
  return "Other";
}

export async function POST(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") ?? "unknown").trim();

  const body = await req.json().catch(() => ({}));
  const description: string = body?.description ?? "";

  if (isDetectRateLimited(ip)) {
    // Degrade to the free local heuristic rather than a hard error -- a real
    // user typing normally never gets near this limit, so this path is only
    // ever hit by scripted abuse; returning a normal-looking fallback result
    // costs nothing and doesn't need special client-side handling.
    console.warn(`[detect-business] RATE LIMIT HIT (${DETECT_RATE_LIMIT}/min): ip=${ip}`);
    return NextResponse.json({ type: description.trim() ? detectFallback(description) : "" });
  }

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
              "You are a business type classifier. Given a business description, respond with ONLY one of these exact labels (copy it exactly):\nDental Clinic\nMedical Clinic\nHair Salon\nBarbershop\nSpa & Massage\nBeauty & Wellness\nGym & Fitness\nReal Estate\nRestaurant\nCoffee Shop\nHotel\nLaw Firm\nEducation & Tutoring\nE-Commerce\nCar Dealership\nAuto Repair\nInterior Design\nPhotography Studio\nMarketing Agency\nCleaning Services\nTravel Agency\nEvent Planning\nPet Services\nConstruction\nAccounting & Finance\nRecruitment\nOther\n\nPick the single best match. Map synonyms: interior designer→Interior Design, photography studio→Photography Studio, digital marketing→Marketing Agency, car garage→Auto Repair, maid service→Cleaning Services, wedding planner→Event Planning, vet→Pet Services, CPA→Accounting & Finance, staffing agency→Recruitment.\nIf none fits clearly, respond with exactly: Other\nReturn ONLY the label. No punctuation, no explanation.",
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
