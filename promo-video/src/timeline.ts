import en from "./timelines/en.json";
import ar from "./timelines/ar.json";

export type Lang = "en" | "ar";
export type Timeline = typeof en;
export const TIMELINES: Record<Lang, Timeline> = { en, ar: ar as unknown as Timeline };

/** Frame where the given word (as spoken, punctuation ignored) starts on a line. */
export function wordAt(tl: Timeline, line: number, word: string, nth = 0): number {
  const clean = (s: string) => s.replace(/[.,،!?؟…]/g, "");
  const hits = tl.words.filter((w) => w.line === line && clean(w.t) === clean(word));
  const hit = hits[nth] ?? hits[0];
  if (!hit) throw new Error(`word "${word}" not on line ${line}`);
  return hit.from;
}

// On-screen copy outside the captions (all built in code, no images).
export const COPY = {
  en: {
    clockSuffix: "PM", closed: "Closed", incoming: "Incoming call", clinic: "Al Noor Dental",
    missed: "Missed call", times: ["9:47 PM", "9:48 PM", "9:52 PM"],
    rival: "Clinic down the street", rivalState: "Answered", lost: "missed this week",
    tagline: "The AI receptionist that never sleeps", cta: "Book a free setup",
  },
  ar: {
    clockSuffix: "م", closed: "مغلق", incoming: "مكالمة واردة", clinic: "عيادة النور للأسنان",
    missed: "مكالمة فائتة", times: ["9:47 م", "9:48 م", "9:52 م"],
    rival: "العيادة اللي جنبك", rivalState: "تم الرد", lost: "راحوا عليك هالأسبوع",
    tagline: "موظف الاستقبال الذكي اللي ما ينام", cta: "احجز إعدادك المجاني",
  },
} as const;
