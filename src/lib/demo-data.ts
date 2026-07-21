// ⚠ DEMO ONLY — Real app pages (src/app/app/*) must never import from this file.

export const DEMO_PROFILE = {
  name: "Ahmed Dental Clinic",
  initials: "AC",
  plan: "premium",
  email: "ahmed@ahmeddentalclinic.ae",
  business: "Ahmed Dental Clinic",
};

export type DemoKPI = { label: string; value: string; change?: number };
export type DemoConv = { id: string; customer_name: string; channel: string; preview: string; time: string; isNew: boolean };
export type DemoAppt = { id: string; time: string; name: string; service: string; status: string; phone: string | null; channel: string };

export const DEMO_KPIS: DemoKPI[] = [
  { label: "kpiTotalLeads",        value: "184", change: 23 },
  { label: "kpiNewLeads",          value: "47",  change: 12 },
  { label: "kpiAppointmentsToday", value: "10",  change: 5  },
];

export const DEMO_CONVS: DemoConv[] = [
  { id: "c1", customer_name: "Sara Khalid",     channel: "whatsapp",  preview: "Is Tuesday 11 AM still available?",    time: "1m",  isNew: true  },
  { id: "c2", customer_name: "Mohammed Hassan", channel: "instagram", preview: "What are your prices for whitening?",  time: "5m",  isNew: true  },
  { id: "c3", customer_name: "Layla Mansouri",  channel: "whatsapp",  preview: "I'd like to book a cleaning please",  time: "18m", isNew: false },
  { id: "c4", customer_name: "Omar Al-Farsi",   channel: "website",   preview: "Do you accept Daman insurance?",      time: "1h",  isNew: false },
  { id: "c5", customer_name: "Fatima Nasser",   channel: "instagram", preview: "How long does a root canal take?",    time: "3h",  isNew: false },
];

export const DEMO_APPTS: DemoAppt[] = [
  { id: "a1",  time: "09:00", name: "Sara Khalid",     service: "Dental Cleaning",   status: "confirmed", phone: "+971 50 123 4567", channel: "whatsapp"  },
  { id: "a2",  time: "09:45", name: "Rania Mahmoud",   service: "Teeth Whitening",   status: "confirmed", phone: "+971 52 345 6789", channel: "instagram" },
  { id: "a3",  time: "10:30", name: "Mohammed Hassan", service: "Teeth Whitening",   status: "confirmed", phone: "+971 55 456 7890", channel: "instagram" },
  { id: "a4",  time: "11:00", name: "Layla Mansouri",  service: "Dental Cleaning",   status: "confirmed", phone: "+971 55 987 6543", channel: "whatsapp"  },
  { id: "a5",  time: "12:00", name: "Khaled Ibrahim",  service: "Cavity Filling",    status: "pending",   phone: "+971 50 456 7890", channel: "website"   },
  { id: "a6",  time: "13:30", name: "Fatima Nasser",   service: "Root Canal",        status: "cancelled", phone: null,               channel: "instagram" },
  { id: "a7",  time: "14:00", name: "Nour Al-Saad",    service: "Orthodontic Check", status: "confirmed", phone: "+971 54 567 8901", channel: "website"   },
  { id: "a8",  time: "15:00", name: "Omar Al-Farsi",   service: "Cavity Filling",    status: "confirmed", phone: "+971 56 234 5678", channel: "whatsapp"  },
  { id: "a9",  time: "15:30", name: "Hassan Youssef",  service: "Root Canal",        status: "pending",   phone: "+971 50 678 9012", channel: "whatsapp"  },
  { id: "a10", time: "16:45", name: "Aisha Qasim",     service: "Dental Cleaning",   status: "pending",   phone: null,               channel: "instagram" },
];

export type DemoLead = {
  id: string; name: string; channel: string; status: string; phone: string | null; updated_at: string;
};

export const DEMO_LEADS: DemoLead[] = [
  { id: "l01", name: "Sara Khalid",     channel: "whatsapp",  status: "new",       phone: "+971 50 123 4567", updated_at: new Date(Date.now() -  2 * 60000).toISOString() },
  { id: "l02", name: "Mohammed Hassan", channel: "instagram", status: "new",       phone: null,               updated_at: new Date(Date.now() -  5 * 60000).toISOString() },
  { id: "l03", name: "Layla Mansouri",  channel: "whatsapp",  status: "contacted", phone: "+971 55 987 6543", updated_at: new Date(Date.now() - 18 * 60000).toISOString() },
  { id: "l04", name: "Omar Al-Farsi",   channel: "website",   status: "contacted", phone: "+971 56 234 5678", updated_at: new Date(Date.now() -  1 * 3600000).toISOString() },
  { id: "l05", name: "Fatima Nasser",   channel: "instagram", status: "qualified", phone: null,               updated_at: new Date(Date.now() -  3 * 3600000).toISOString() },
  { id: "l06", name: "Rania Mahmoud",   channel: "whatsapp",  status: "qualified", phone: "+971 52 345 6789", updated_at: new Date(Date.now() -  5 * 3600000).toISOString() },
  { id: "l07", name: "Khaled Ibrahim",  channel: "whatsapp",  status: "booked",    phone: "+971 50 456 7890", updated_at: new Date(Date.now() -  8 * 3600000).toISOString() },
  { id: "l08", name: "Nour Al-Saad",    channel: "website",   status: "booked",    phone: "+971 54 567 8901", updated_at: new Date(Date.now() - 12 * 3600000).toISOString() },
  { id: "l09", name: "Aisha Qasim",     channel: "instagram", status: "client",    phone: null,               updated_at: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: "l10", name: "Hassan Youssef",  channel: "whatsapp",  status: "client",    phone: "+971 50 678 9012", updated_at: new Date(Date.now() - 48 * 3600000).toISOString() },
];

// ── Message threads ──────────────────────────────────────────────────────────

export type DemoMsg = { id: string; role: "user" | "agent"; text: string; time: string };

export const DEMO_MSG_THREADS: Record<string, DemoMsg[]> = {
  c1: [
    { id: "m1", role: "agent", text: "Hello! Welcome to Ahmed Dental Clinic. How can I help you today? 😊", time: "09:38" },
    { id: "m2", role: "user",  text: "Hi! I saw your page online. Do you have cleaning appointments this week?", time: "09:39" },
    { id: "m3", role: "agent", text: "Absolutely! We have several slots available. Our dental cleaning is AED 280 and includes a full checkup. Which day works best for you?", time: "09:39" },
    { id: "m4", role: "user",  text: "What about Tuesday?", time: "09:40" },
    { id: "m5", role: "agent", text: "We have Tuesday at 9:00 AM, 11:00 AM, or 2:30 PM. Any of these work?", time: "09:40" },
    { id: "m6", role: "user",  text: "Is Tuesday 11 AM still available?", time: "09:41" },
  ],
  c2: [
    { id: "m1", role: "agent", text: "Hello! How can I help you today?", time: "09:34" },
    { id: "m2", role: "user",  text: "Hi! I've been thinking about getting my teeth whitened", time: "09:34" },
    { id: "m3", role: "agent", text: "Great choice! We offer professional whitening at Ahmed Dental Clinic. Results last 12–18 months and our team uses the latest techniques. Would you like pricing info?", time: "09:34" },
    { id: "m4", role: "user",  text: "What are your prices for whitening?", time: "09:35" },
  ],
  c3: [
    { id: "m1", role: "agent", text: "Hello! Welcome to Ahmed Dental Clinic. I’m Vela, your AI assistant. How can I help?", time: "09:20" },
    { id: "m2", role: "user",  text: "I'd like to book a cleaning please", time: "09:21" },
  ],
  c4: [
    { id: "m1", role: "user",  text: "Hello, I have a question about insurance coverage.", time: "08:58" },
    { id: "m2", role: "agent", text: "Of course! We work with several insurance providers in the UAE. Which insurance do you have?", time: "08:58" },
    { id: "m3", role: "user",  text: "I have Daman insurance.", time: "08:59" },
    { id: "m4", role: "agent", text: "Thank you! Let me check our accepted insurance list for Daman coverage.", time: "08:59" },
    { id: "m5", role: "user",  text: "Do you accept Daman insurance?", time: "09:00" },
  ],
  c5: [
    { id: "m1", role: "user",  text: "Hi! I’m quite worried about getting a root canal", time: "06:42" },
    { id: "m2", role: "agent", text: "I completely understand! Root canals are actually much more comfortable than most people expect with modern techniques. What specifically concerns you?", time: "06:42" },
    { id: "m3", role: "user",  text: "Mostly the time — I’m very busy and can’t take too long off.", time: "06:43" },
    { id: "m4", role: "agent", text: "A typical root canal at our clinic takes 60–90 minutes per session, and most cases need just one visit. Our team works efficiently to respect your schedule!", time: "06:43" },
    { id: "m5", role: "user",  text: "How long does a root canal take?", time: "06:44" },
  ],
};

// ── AI Agent call logs ───────────────────────────────────────────────────────

export type DemoCall = {
  id: string;
  name: string;
  phone: string | null;
  duration: string;
  outcome: "resolved" | "transferred" | "no-answer" | "booked";
  time: string;
  summary: string;
  transcript: { role: "agent" | "caller"; text: string }[];
};

export const DEMO_CALLS: DemoCall[] = [
  {
    id: "call1", name: "Sara Khalid", phone: "+971 50 123 4567",
    duration: "2:14", outcome: "booked", time: "09:41",
    summary: "Caller booked a dental cleaning for Tuesday at 11:00 AM. Confirmed name and contact details.",
    transcript: [
      { role: "agent",  text: "Thank you for calling Ahmed Dental Clinic. I’m Vela, your AI assistant. How can I help you today?" },
      { role: "caller", text: "Hi, I’d like to book a dental cleaning please." },
      { role: "agent",  text: "Of course! Our dental cleaning includes a full checkup and professional clean, starting from AED 280. What day works best for you?" },
      { role: "caller", text: "Tuesday at 11 AM if possible." },
      { role: "agent",  text: "Perfect! I’ve booked you for Tuesday at 11:00 AM for a dental cleaning. Can I confirm your name?" },
      { role: "caller", text: "Sara Khalid." },
      { role: "agent",  text: "Wonderful, Sara! Your appointment is confirmed for Tuesday at 11:00 AM. You’ll receive a WhatsApp confirmation shortly. See you then!" },
    ],
  },
  {
    id: "call2", name: "Mohammed Hassan", phone: "+971 55 456 7890",
    duration: "1:47", outcome: "transferred", time: "09:35",
    summary: "Caller asked about whitening prices and payment plan options. Transferred to billing team.",
    transcript: [
      { role: "agent",  text: "Thank you for calling Ahmed Dental Clinic. How can I help?" },
      { role: "caller", text: "Hi, I’m asking about teeth whitening prices." },
      { role: "agent",  text: "Our professional whitening starts from AED 1,200. We also have a premium package at AED 2,000 with a follow-up session included." },
      { role: "caller", text: "Is there a payment plan available?" },
      { role: "agent",  text: "For payment plans, I’ll connect you with our team now. One moment please!" },
    ],
  },
  {
    id: "call3", name: "Layla Mansouri", phone: "+971 55 987 6543",
    duration: "3:22", outcome: "booked", time: "09:20",
    summary: "Caller booked a cleaning and asked about parking and procedure comfort.",
    transcript: [
      { role: "agent",  text: "Thank you for calling Ahmed Dental Clinic. I’m Vela. How can I help you?" },
      { role: "caller", text: "Hi! I’d like to book a cleaning. Also, is there parking available?" },
      { role: "agent",  text: "Absolutely! We have free parking in our building. When would you like to come in?" },
      { role: "caller", text: "Thursday morning would be great." },
      { role: "agent",  text: "We have Thursday at 9:00 AM and 10:30 AM available. Which works for you?" },
      { role: "caller", text: "10:30 AM please. And does the cleaning hurt?" },
      { role: "agent",  text: "Not at all! It’s very comfortable. We use gentle techniques. Booked for Thursday 10:30 AM — see you then!" },
    ],
  },
  {
    id: "call4", name: "Rania Mahmoud", phone: "+971 52 345 6789",
    duration: "0:58", outcome: "resolved", time: "08:45",
    summary: "Caller confirmed their existing appointment and asked what to bring. Fully resolved.",
    transcript: [
      { role: "agent",  text: "Thank you for calling Ahmed Dental Clinic. How can I help?" },
      { role: "caller", text: "Hi, I have an appointment today at 10:30 and wanted to confirm it’s still on." },
      { role: "agent",  text: "Yes, your appointment at 10:30 AM with Dr. Ahmed is confirmed! Please bring your Emirates ID and insurance card if you have one." },
      { role: "caller", text: "Perfect, thank you!" },
    ],
  },
  {
    id: "call5", name: "Khaled Ibrahim", phone: "+971 50 456 7890",
    duration: "2:05", outcome: "booked", time: "08:30",
    summary: "Caller inquired about cavity filling, got pricing info and booked a consultation.",
    transcript: [
      { role: "agent",  text: "Thank you for calling Ahmed Dental Clinic. How can I help you today?" },
      { role: "caller", text: "I think I might have a cavity. What does it cost to get it filled?" },
      { role: "agent",  text: "Our cavity filling starts from AED 350 for a tooth-colored composite filling. We can do a checkup first to assess it. Would you like to book?" },
      { role: "caller", text: "Yes, let’s do that." },
      { role: "agent",  text: "Booked you for Wednesday at 12:00 PM. You’ll receive a confirmation on WhatsApp. Anything else I can help with?" },
      { role: "caller", text: "No, that’s great. Thanks!" },
    ],
  },
  {
    id: "call6", name: "Omar Al-Farsi", phone: "+971 56 234 5678",
    duration: "1:33", outcome: "resolved", time: "08:15",
    summary: "Caller asked about Daman insurance coverage. Confirmed Daman is accepted for most services.",
    transcript: [
      { role: "agent",  text: "Thank you for calling Ahmed Dental Clinic. How can I help?" },
      { role: "caller", text: "Do you accept Daman insurance?" },
      { role: "agent",  text: "Yes, we accept Daman for most services including cleaning, fillings, and X-rays. Cosmetic procedures like whitening are typically out of pocket." },
      { role: "caller", text: "Great, that’s all I needed to know." },
      { role: "agent",  text: "Happy to help! Feel free to call back if you have any other questions." },
    ],
  },
  {
    id: "call7", name: "Fatima Nasser", phone: null,
    duration: "0:00", outcome: "no-answer", time: "07:55",
    summary: "No answer. Voicemail not available.",
    transcript: [],
  },
  {
    id: "call8", name: "Hassan Youssef", phone: "+971 50 678 9012",
    duration: "4:12", outcome: "transferred", time: "07:30",
    summary: "Long consultation about root canal procedure, costs, and recovery. Transferred to Dr. Ahmed.",
    transcript: [
      { role: "agent",  text: "Thank you for calling Ahmed Dental Clinic. How can I help?" },
      { role: "caller", text: "I’ve been told I need a root canal. Can you tell me everything about it?" },
      { role: "agent",  text: "Of course! A root canal removes infected pulp from inside the tooth. It’s more comfortable than people expect — typically 60–90 minutes and costs from AED 1,800." },
      { role: "caller", text: "How many sessions will I need? And what about recovery?" },
      { role: "agent",  text: "Most cases need just one session. Recovery is mild — some soreness for 2–3 days. For your specific case, let me connect you with Dr. Ahmed directly." },
    ],
  },
  {
    id: "call9", name: "Nour Al-Saad", phone: "+971 54 567 8901",
    duration: "1:55", outcome: "booked", time: "07:15",
    summary: "Caller asked about orthodontic options for adults. Booked an orthodontic consultation.",
    transcript: [
      { role: "agent",  text: "Thank you for calling Ahmed Dental Clinic. How can I help you?" },
      { role: "caller", text: "Hi, I’m an adult considering braces. Is it too late?" },
      { role: "agent",  text: "Not at all! Adults absolutely benefit from orthodontic treatment. We offer traditional braces and clear aligners. Would you like to book a consultation?" },
      { role: "caller", text: "Yes, what’s the price for clear aligners?" },
      { role: "agent",  text: "Clear aligner treatment starts from AED 3,500 depending on complexity. I’ve booked you a free consultation next Monday at 2:00 PM." },
    ],
  },
  {
    id: "call10", name: "Aisha Qasim", phone: null,
    duration: "2:31", outcome: "resolved", time: "07:00",
    summary: "Caller rescheduled their appointment from Wednesday to Friday at 11:30 AM.",
    transcript: [
      { role: "agent",  text: "Thank you for calling Ahmed Dental Clinic. How can I help?" },
      { role: "caller", text: "I need to reschedule my Wednesday 4:45 PM appointment." },
      { role: "agent",  text: "Of course! When would you like to reschedule to?" },
      { role: "caller", text: "Can we do Friday morning?" },
      { role: "agent",  text: "We have Friday at 9:00 AM and 11:30 AM. Which works?" },
      { role: "caller", text: "11:30 AM please." },
      { role: "agent",  text: "Done! Your cleaning has been moved to Friday at 11:30 AM. You’ll get a confirmation shortly." },
    ],
  },
];

// ── Knowledge base ───────────────────────────────────────────────────────────

export const DEMO_KB = {
  services: [
    { name: "Dental Cleaning",  price: "AED 280",        duration: "45 min",     description: "Professional cleaning and full checkup by our expert hygienists" },
    { name: "Teeth Whitening",  price: "AED 1,200",      duration: "90 min",     description: "Professional-grade whitening for a brighter, confident smile" },
    { name: "Cavity Filling",   price: "AED 350",        duration: "60 min",     description: "Tooth-colored composite fillings that blend naturally" },
    { name: "Root Canal",       price: "AED 1,800",      duration: "90 min",     description: "Pain-free root canal treatment with modern techniques" },
    { name: "Orthodontics",     price: "from AED 3,500", duration: "Ongoing",    description: "Braces and clear aligners for all ages" },
    { name: "Dental Implants",  price: "from AED 5,000", duration: "Multi-visit",description: "Permanent tooth replacement that looks and feels natural" },
    { name: "Emergency Visit",  price: "AED 200",        duration: "30 min",     description: "Same-day appointments for dental emergencies" },
  ],
  business: {
    hours: "Sunday–Thursday: 9:00 AM – 6:00 PM\nFriday: 9:00 AM – 1:00 PM\nSaturday: Closed",
    address: "Building 5, Business Bay, Dubai, UAE",
    bookingPolicy: "Appointments can be booked online or via WhatsApp. 24-hour cancellation notice required. Late arrivals (15+ min) may need to reschedule.",
    tone: "professional" as const,
  },
  extra: "We use the latest dental technology including digital X-rays and laser dentistry. Dr. Ahmed Al-Rashid has 12+ years of experience. 4.9 stars on Google from 800+ reviews. WhatsApp: +971 4 123 4567. Email: info@ahmeddentalclinic.ae. We accept Daman, ADNIC, AXA, MetLife, and most UAE insurance providers.",
};

// ── Analytics ────────────────────────────────────────────────────────────────

export type DemoAnalyticsDay = { date: string; leads: number; convs: number; appts: number };

export const DEMO_ANALYTICS_DAYS: DemoAnalyticsDay[] = [
  { date: "2026-06-21", leads: 3,  convs: 5,  appts: 2 },
  { date: "2026-06-22", leads: 5,  convs: 7,  appts: 3 },
  { date: "2026-06-23", leads: 4,  convs: 6,  appts: 2 },
  { date: "2026-06-24", leads: 6,  convs: 8,  appts: 4 },
  { date: "2026-06-25", leads: 3,  convs: 5,  appts: 2 },
  { date: "2026-06-26", leads: 2,  convs: 3,  appts: 1 },
  { date: "2026-06-27", leads: 4,  convs: 6,  appts: 2 },
  { date: "2026-06-28", leads: 4,  convs: 6,  appts: 2 },
  { date: "2026-06-29", leads: 6,  convs: 8,  appts: 3 },
  { date: "2026-06-30", leads: 5,  convs: 7,  appts: 3 },
  { date: "2026-07-01", leads: 7,  convs: 9,  appts: 4 },
  { date: "2026-07-02", leads: 4,  convs: 6,  appts: 2 },
  { date: "2026-07-03", leads: 3,  convs: 4,  appts: 2 },
  { date: "2026-07-04", leads: 5,  convs: 7,  appts: 3 },
  { date: "2026-07-05", leads: 5,  convs: 7,  appts: 3 },
  { date: "2026-07-06", leads: 7,  convs: 9,  appts: 4 },
  { date: "2026-07-07", leads: 6,  convs: 8,  appts: 3 },
  { date: "2026-07-08", leads: 8,  convs: 10, appts: 5 },
  { date: "2026-07-09", leads: 5,  convs: 7,  appts: 3 },
  { date: "2026-07-10", leads: 4,  convs: 5,  appts: 2 },
  { date: "2026-07-11", leads: 6,  convs: 8,  appts: 4 },
  { date: "2026-07-12", leads: 6,  convs: 8,  appts: 4 },
  { date: "2026-07-13", leads: 8,  convs: 10, appts: 5 },
  { date: "2026-07-14", leads: 7,  convs: 9,  appts: 4 },
  { date: "2026-07-15", leads: 9,  convs: 12, appts: 6 },
  { date: "2026-07-16", leads: 6,  convs: 8,  appts: 4 },
  { date: "2026-07-17", leads: 5,  convs: 6,  appts: 3 },
  { date: "2026-07-18", leads: 7,  convs: 9,  appts: 4 },
  { date: "2026-07-19", leads: 8,  convs: 10, appts: 5 },
  { date: "2026-07-20", leads: 9,  convs: 12, appts: 6 },
];

export const DEMO_ANALYTICS_CHANNELS = [
  { channel: "WhatsApp", leads: 74, convs: 98, pct: 44 },
  { channel: "Instagram", leads: 58, convs: 79, pct: 35 },
  { channel: "Website", leads: 35, convs: 48, pct: 21 },
];

// ── Marketing pre-generated outputs ─────────────────────────────────────────

export const DEMO_MARKETING = {
  social: {
    prompt: "Promote our summer offer",
    platform: "Instagram",
    tone: "Friendly",
    result: `✨ Summer Smile Special at Ahmed Dental Clinic! ✨

Get your brightest smile this summer with our exclusive offers:

🦷 Dental Cleaning — AED 280 (includes full checkup!)
✨ Teeth Whitening — AED 1,200 (limited slots available)

Our team uses the latest technology to make your experience as comfortable as possible. Whether it’s a routine cleaning or a total smile makeover, we’ve got you covered! 🌟

📍 Business Bay, Dubai
📞 Book via WhatsApp or DM us
⏰ Sun–Thu 9AM–6PM

Don’t miss out — summer appointments are filling fast! 🌞

#AhmedDentalClinic #DubaiDentist #SmileGoals #DentalCleaning #TeethWhitening #DubaiHealthcare`,
  },
  broadcast: {
    audience: "Unbooked Leads",
    channel: "WhatsApp",
    result: `Hi {{name}}! 👋

You recently asked about our dental services at Ahmed Dental Clinic and we’d love to help you get that appointment scheduled.

This month, we have some great availability and a special offer just for you:

✅ Dental Cleaning — AED 280
✅ Teeth Whitening — AED 1,200
✅ Free consultation for new patients

Our clinic is in Business Bay, Dubai, and we’re open Sunday–Thursday 9AM–6PM.

Reply YES to this message or call +971 4 123 4567 and we’ll get you booked in today! 😊

– The Team at Ahmed Dental Clinic`,
  },
  video: {
    topic: "Why patients love us",
    duration: "60s",
    result: `🎬 VIDEO SCRIPT — 60 SECONDS
"Why Dubai Families Choose Ahmed Dental Clinic"

[HOOK — 0:00–0:05]
VISUAL: Close-up of a bright, confident smile
VOICEOVER: "What if going to the dentist didn’t have to be scary?"

[PROBLEM — 0:05–0:15]
VISUAL: Person looking worried about a dental visit
VOICEOVER: "Most people put off dental care because they’re worried about pain, cost, or finding a clinic they can trust."

[SOLUTION — 0:15–0:35]
VISUAL: Welcoming clinic interior, modern equipment, friendly staff
VOICEOVER: "At Ahmed Dental Clinic in Dubai’s Business Bay, we’ve helped over 4,800 patients with gentle, professional care. Dr. Ahmed Al-Rashid brings 12+ years of experience."

[SOCIAL PROOF — 0:35–0:50]
VISUAL: Google review screenshots, patient smiles
VOICEOVER: "With a 4.9-star rating on Google, our patients keep coming back — and bringing their families."

[CTA — 0:50–1:00]
VISUAL: Clinic logo, WhatsApp QR code
VOICEOVER: "Book your appointment today via WhatsApp or our website. New patients get a complimentary consultation."
TEXT: +971 4 123 4567 | Business Bay, Dubai`,
  },
};

// ── Website builder chat history ─────────────────────────────────────────────

export type DemoWebMsg = { role: "user" | "agent"; text: string };

export const DEMO_WEBSITE_CHAT: DemoWebMsg[] = [
  { role: "agent", text: "Hi! I’m Vela. I’ll help you build your website in a few quick questions. What’s the name of your business?" },
  { role: "user",  text: "Ahmed Dental Clinic" },
  { role: "agent", text: "Great! What type of business is Ahmed Dental Clinic?" },
  { role: "user",  text: "A dental clinic in Dubai" },
  { role: "agent", text: "What services do you offer? List a few key ones." },
  { role: "user",  text: "Cleaning, whitening, fillings, root canals, orthodontics, and implants" },
  { role: "agent", text: "What’s a catchy tagline for your clinic?" },
  { role: "user",  text: "Professional dental care for the whole family" },
  { role: "agent", text: "What’s your clinic’s address and phone number?" },
  { role: "user",  text: "Business Bay, Dubai. +971 4 123 4567" },
  { role: "agent", text: "✅ Your site is ready! I’ve built a professional dental clinic website with your services, location, and contact info. Check the preview on the right — you can publish it with one click!" },
];

// ── Website HTML snapshot ────────────────────────────────────────────────────

export const DEMO_SITE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ahmed Dental Clinic</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1e293b;background:#fff}
a{text-decoration:none;color:inherit}
header{background:#0c4a6e;padding:14px 28px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
.logo{color:#fff;font-size:17px;font-weight:800}
nav a{color:#bae6fd;font-size:13px;margin-left:20px}
nav a:hover{color:#fff}
.contact-bar{background:#0ea5e9;padding:9px 28px;display:flex;justify-content:center;gap:28px;flex-wrap:wrap}
.contact-bar span{color:#fff;font-size:12px}
.hero{background:linear-gradient(135deg,#0c4a6e 0%,#0369a1 100%);padding:72px 28px;text-align:center;color:#fff}
.badge{display:inline-flex;align-items:center;background:rgba(255,255,255,.15);color:#fff;padding:5px 14px;border-radius:99px;font-size:11px;font-weight:600;margin-bottom:18px}
.hero h1{font-size:30px;font-weight:800;margin-bottom:14px;line-height:1.2}
.hero p{font-size:14px;color:#bae6fd;margin-bottom:28px;max-width:440px;margin-left:auto;margin-right:auto}
.btn{display:inline-block;padding:12px 26px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;border:none}
.btn-primary{background:#0ea5e9;color:#fff}
.services{padding:56px 28px;background:#f0f9ff}
.services h2{text-align:center;font-size:22px;font-weight:800;color:#0c4a6e;margin-bottom:6px}
.sub{text-align:center;color:#64748b;font-size:13px;margin-bottom:32px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:840px;margin:0 auto}
.card{background:#fff;border-radius:14px;padding:20px;border:1.5px solid #e0f2fe}
.icon{font-size:24px;margin-bottom:10px}
.card h3{font-size:13px;font-weight:700;color:#0c4a6e;margin-bottom:5px}
.card p{font-size:11px;color:#64748b;line-height:1.5}
.price{font-size:12px;font-weight:700;color:#0ea5e9;margin-top:6px}
.trust{padding:48px 28px;background:#fff}
.trust h2{text-align:center;font-size:20px;font-weight:700;color:#1e293b;margin-bottom:28px}
.stats{display:flex;justify-content:center;gap:40px;flex-wrap:wrap}
.stat{text-align:center}
.stat .num{font-size:28px;font-weight:800;color:#0c4a6e}
.stat .lbl{font-size:11px;color:#64748b;margin-top:3px}
.cta-sec{background:linear-gradient(135deg,#0c4a6e,#0284c7);padding:56px 28px;text-align:center;color:#fff}
.cta-sec h2{font-size:22px;font-weight:800;margin-bottom:10px}
.cta-sec p{color:#bae6fd;font-size:13px;margin-bottom:24px}
.btn-white{background:#fff;color:#0c4a6e}
footer{background:#0c4a6e;color:#7dd3fc;padding:20px 28px;text-align:center;font-size:11px}
@media(max-width:580px){.grid{grid-template-columns:1fr 1fr}.stats{gap:20px}.hero h1{font-size:22px}}
</style>
</head>
<body>
<header>
  <div class="logo">&#x1F9B7; Ahmed Dental Clinic</div>
  <nav>
    <a href="#">Services</a>
    <a href="#">About</a>
    <a href="#">Insurance</a>
    <a href="#">Contact</a>
  </nav>
</header>
<div class="contact-bar">
  <span>&#128205; Business Bay, Dubai</span>
  <span>&#128222; +971 4 123 4567</span>
  <span>&#9200; Sun&#8211;Thu 9AM&#8211;6PM</span>
</div>
<section class="hero">
  <div class="badge">&#10003; 4.9&#9733; Rated Dental Clinic in Dubai</div>
  <h1>Your Smile Deserves<br>the Best Care</h1>
  <p>Professional dental services for the whole family. Modern technology, compassionate care.</p>
  <a href="#" class="btn btn-primary">Book Appointment &#8594;</a>
</section>
<section class="services">
  <h2>Our Services</h2>
  <p class="sub">Everything your smile needs, under one roof</p>
  <div class="grid">
    <div class="card"><div class="icon">&#x1FAA5;</div><h3>Dental Cleaning</h3><p>Professional cleaning &amp; full checkup</p><div class="price">from AED 280</div></div>
    <div class="card"><div class="icon">&#x2728;</div><h3>Teeth Whitening</h3><p>Professional-grade whitening results</p><div class="price">from AED 1,200</div></div>
    <div class="card"><div class="icon">&#x1F9F0;</div><h3>Cavity Filling</h3><p>Tooth-colored composite fillings</p><div class="price">from AED 350</div></div>
    <div class="card"><div class="icon">&#x1F9B7;</div><h3>Root Canal</h3><p>Pain-free with modern techniques</p><div class="price">from AED 1,800</div></div>
    <div class="card"><div class="icon">&#x1F60C;</div><h3>Orthodontics</h3><p>Braces &amp; clear aligners for all ages</p><div class="price">from AED 3,500</div></div>
    <div class="card"><div class="icon">&#x1F3C6;</div><h3>Dental Implants</h3><p>Permanent tooth replacement</p><div class="price">from AED 5,000</div></div>
  </div>
</section>
<section class="trust">
  <h2>Trusted by Dubai Families</h2>
  <div class="stats">
    <div class="stat"><div class="num">4,800+</div><div class="lbl">Happy Patients</div></div>
    <div class="stat"><div class="num">12+</div><div class="lbl">Years Experience</div></div>
    <div class="stat"><div class="num">4.9&#9733;</div><div class="lbl">Google Rating</div></div>
    <div class="stat"><div class="num">15+</div><div class="lbl">Insurance Networks</div></div>
  </div>
</section>
<section class="cta-sec">
  <h2>Ready for Your Next Visit?</h2>
  <p>Book online in seconds or chat with our AI assistant 24/7</p>
  <a href="#" class="btn btn-white">Book Now &#8212; It&#39;s Free</a>
</section>
<footer>&#169; 2026 Ahmed Dental Clinic &#183; Business Bay, Dubai &#183; Powered by Vela</footer>
</body>
</html>`;
