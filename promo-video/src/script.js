// The exact approved copy. Voice text writes the brand as "ڤيلا" in Arabic so
// it is pronounced right; captions always show "Vela" in Latin letters.
// Each line is split into caption chunks of 2 to 6 words.

export const SCRIPT = {
  en: [
    "It's 9:47 PM. Your clinic is closed... and your phone is ringing.",
    "A patient wants to book. Nobody answers. So they call the clinic down the street.",
    "Every missed call is a missed patient. And people don't wait.",
    "Meet Vela. The AI receptionist that never sleeps.",
    "Vela answers every call, in Arabic or English. It knows your services, your prices and your hours.",
    "When the patient is ready, it books the appointment straight into your calendar. No double bookings. Never on a closed day.",
    "You see every call, every transcript, every booking. All in one place.",
    "We set everything up for you. You keep your number. Vela. velaos.co",
  ],
  ar: [
    "الساعة تسع وسبعة وأربعين بالليل. العيادة مسكّرة... والتلفون يرن.",
    "مريض يبي يحجز. ما أحد يرد. فيتصل على العيادة اللي جنبك.",
    "كل مكالمة ما ترد عليها، مريض راح عليك. والناس ما تنتظر.",
    "هذا Vela. موظف الاستقبال الذكي اللي ما ينام.",
    "يرد على كل مكالمة، بالعربي أو الإنجليزي. يعرف خدماتك، وأسعارك، ومواعيد دوامك.",
    "ولما يكون المريض جاهز، يحجز له الموعد في جدولك على طول. بدون حجز مكرر، وما يحجز أبداً في يوم إجازة.",
    "تشوف كل مكالمة، وكل محادثة، وكل حجز. كله في مكان واحد.",
    "واحنا نجهز لك كل شي. رقمك يبقى نفسه. Vela. velaos.co",
  ],
};

/** What the voice reads: lines joined by a newline; Arabic says "ڤيلا". */
export function voiceText(lang) {
  const lines = SCRIPT[lang].map((l) => (lang === "ar" ? l.replace(/Vela/g, "ڤيلا") : l));
  return lines.join("\n");
}
