// The WhatsApp video (VelaWA): approved voiceover, one sentence per line.
// Voice text writes the brand as "ڤيلا" in Arabic so it is pronounced right;
// captions and on-screen text always show "Vela" in Latin letters.
// General on purpose: any business, no niche, no business names.

export const WA_SCRIPT = {
  en: [
    "Every business has calls it can't pick up.",
    "After closing.",
    "On Fridays.",
    "When the line is busy.",
    "Vela answers them, in Arabic and English, knows your services, and books the appointment for you.",
    "Day and night.",
    "Vela. The receptionist that never sleeps.",
  ],
  ar: [
    "كل بزنس عنده مكالمات ما يلحق يرد عليها.",
    "بعد الدوام.",
    "يوم الجمعة.",
    "لما يكون الخط مشغول.",
    "Vela ترد عليها بالعربي والإنجليزي، تعرف خدماتك، وتحجز الموعد عنك.",
    "ليل ونهار.",
    "Vela، موظفة الاستقبال اللي ما تنام.",
  ],
};

// Where each line should start (seconds), following the storyboard; a line never
// starts before the previous one has ended plus a short breath.
export const LINE_AT = [0.6, 3.2, 4.45, 5.7, 7.9, 16.0, 18.2];
export const END_HOLD = 2.6; // the end card holds after the last word
export const MIN_TOTAL = 22.5, MAX_TOTAL = 25;

export const voiceText = (lang) => WA_SCRIPT[lang].map((l) => (lang === "ar" ? l.replace(/Vela/g, "ڤيلا") : l)).join("\n");

// On-screen copy (kinetic type and the UI inside the phone). Numbers are masked.
export const WA_COPY = {
  en: {
    afterHours: "After hours", fridays: "Fridays.", busy: "Busy lines.",
    missed: "Missed calls", incoming: "Incoming call", caller: "+974 •••• ••••", closed: "Closed",
    answering: "Vela is answering", answered: "Answered by Vela", live: "Live call",
    you: "Customer", vela: "Vela",
    bubbles: [
      ["c", "Hi, can I book something for tomorrow evening?"],
      ["v", "Of course. I have 6:00 or 7:30 PM. Which suits you?"],
      ["c", "7:30, please."],
      ["v", "Done. See you tomorrow at 7:30 PM."],
    ],
    booked: "Appointment booked", when: "Tomorrow, 7:30 PM", who: "Sara", phone: "+974 •••• ••••",
    week: "This week", days: ["Mon", "Tue", "Wed", "Thu"], tomorrow: 1, hours: ["5 PM", "6 PM", "7 PM", "8 PM", "9 PM"], newLabel: "Sara · 7:30 PM",
    tagline: ["The receptionist", "that never sleeps"], url: "velaos.co",
  },
  ar: {
    afterHours: "بعد الدوام", fridays: "يوم الجمعة.", busy: "الخط مشغول.",
    missed: "مكالمات فائتة", incoming: "مكالمة واردة", caller: "+974 •••• ••••", closed: "مسكّر",
    answering: "Vela ترد الحين", answered: "ردّت Vela", live: "مكالمة مباشرة",
    you: "العميل", vela: "Vela",
    bubbles: [
      ["c", "مرحبا، أبي أحجز موعد بكرة المسا."],
      ["v", "أكيد، عندي الساعة ست أو سبع ونص. أي وقت يناسبك؟"],
      ["c", "سبع ونص لو سمحتي."],
      ["v", "تم، موعدك بكرة الساعة سبع ونص المسا."],
    ],
    booked: "تم حجز الموعد", when: "بكرة، 7:30 م", who: "سارة", phone: "+974 •••• ••••",
    week: "هالأسبوع", days: ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس"], tomorrow: 1, hours: ["5 م", "6 م", "7 م", "8 م", "9 م"], newLabel: "سارة · 7:30 م",
    tagline: ["موظفة الاستقبال", "اللي ما تنام"], url: "velaos.co",
  },
};
