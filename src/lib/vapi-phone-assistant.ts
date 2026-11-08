/**
 * Real inbound phone agent ("receptionist") assistant builder, v2.
 *
 * One builder for both places a phone assistant is created:
 *  - call-webhook assistant-request (fresh per call: schedule, caller ID, date)
 *  - api/ai-agent/phone (the stored fallback assistant)
 * so the two can never drift. Browser test calls (Overview/Training) use the
 * same stack through buildBrowserCallAssistant below.
 *
 * Restore point for the previous voice stack: git tag voice-v1.
 *
 * Choices (verified against Vapi's live API schema, api.vapi.ai/api-json,
 * and measured where possible; see the voice-v2 commit for the full table):
 *  - Transcriber: Soniox stt-rt-v5 with language HINTS ar+en (not strict, so
 *    Hindi/Urdu/other callers still transcribe) for Gulf Arabic + English
 *    code-switching, custom vocabulary for the business/service names, and
 *    Soniox's semantic end-of-turn detection tuned for speed. Fallback:
 *    Speechmatics bilingual "ar_en". The old setup pinned Scribe to ONE
 *    language ("en" unless set), so Arabic or mixed speech was forced
 *    through the wrong language model.
 *  - Voice: ElevenLabs eleven_v4_turbo (measured ~165 ms first audio for
 *    Arabic vs ~355 ms for the old eleven_multilingual_v2), fallback
 *    eleven_flash_v2_5. Default voice: a Gulf/Saudi female customer-care
 *    voice from the ElevenLabs library; the owner's saved voice still wins.
 *  - LLM: gpt-4.1-mini (fast first token, reliable tool calls), short turns.
 *  - Static first message (no LLM round trip before the greeting).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { CALL_LIMITS, DEFAULT_SPEED, DEFAULT_VOICE_ID, clampSpeed } from "@/lib/vapi-agent-config";
import { BOOK_APPOINTMENT_TOOL, buildBookAppointmentTool, type VapiServerConfig } from "@/lib/vapi-webhook";

// ── Voice ────────────────────────────────────────────────────────────────────
/** "Heba, Arabic customer care" (ElevenLabs library, Saudi/Gulf, conversational). */
export const DEFAULT_PHONE_VOICE_ID = DEFAULT_VOICE_ID;
export const PHONE_VOICE_MODEL = "eleven_v4_turbo";
export const PHONE_VOICE_FALLBACK_MODEL = "eleven_flash_v2_5";
/** Natural conversational pace (the old default was 1.1, slightly rushed). */
export const DEFAULT_PHONE_SPEED = DEFAULT_SPEED;
const PHONE_LLM = { provider: "openai" as const, model: "gpt-4.1-mini", temperature: 0.5 };

export function getPhoneVoiceConfig(voiceId: string | undefined, speed: number | undefined) {
  const id = voiceId || DEFAULT_PHONE_VOICE_ID;
  const s = clampSpeed(typeof speed === "number" ? speed : DEFAULT_PHONE_SPEED);
  return {
    provider: "11labs" as const,
    voiceId: id,
    model: PHONE_VOICE_MODEL,
    // v4 turbo ignores the tuning fields below; they apply to the fallback.
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0,
    useSpeakerBoost: true,
    speed: s,
    fallbackPlan: {
      voices: [{ provider: "11labs" as const, voiceId: id, model: PHONE_VOICE_FALLBACK_MODEL, stability: 0.5, similarityBoost: 0.75, speed: s }],
    },
  };
}

// ── Transcriber ──────────────────────────────────────────────────────────────
/** Business name words, service names and "Vela", deduped, max 40. */
export function buildKeyterms(businessName: string, services: Array<{ name?: string }>): string[] {
  const terms = new Set<string>(["Vela"]);
  if (businessName.trim()) terms.add(businessName.trim());
  for (const s of services) if (typeof s?.name === "string" && s.name.trim()) terms.add(s.name.trim());
  return Array.from(terms).slice(0, 40);
}

export function getPhoneTranscriberConfig(keyterms: string[], ownerLanguage?: string) {
  const extra = (ownerLanguage ?? "").trim().toLowerCase();
  const hints = Array.from(new Set(["ar", "en", ...(extra && /^[a-z]{2}$/.test(extra) ? [extra] : [])]));
  return {
    provider: "soniox" as const,
    model: "stt-rt-v5" as const,
    languages: hints,
    languageHintsStrict: false,
    customVocabulary: keyterms,
    contextGeneral: [
      { key: "domain", value: "Phone call to a business receptionist" },
      { key: "region", value: "Qatar and the Gulf; callers mix Gulf Arabic and English" },
    ],
    maxEndpointDelayMs: 700,
    endpointSensitivity: 0,
    endpointLatencyAdjustmentLevel: 2,
    fallbackPlan: {
      transcribers: [{
        provider: "speechmatics" as const,
        language: "ar_en",
        operatingPoint: "standard",
        maxDelay: 700,
        customVocabulary: keyterms.map((content) => ({ content })),
      }],
    },
  };
}

// ── Turn-taking ──────────────────────────────────────────────────────────────
// Short words that mean "keep going" (never interrupt the agent) and words
// that always mean "stop" (interrupt immediately), in English and Gulf Arabic.
const ACK_PHRASES = [
  "i see", "i got it", "right", "okay", "ok", "sure", "alright", "got it", "yeah", "yes", "uh-huh", "mm-hmm", "mhmm", "mm", "ah",
  "اي", "ايه", "ايوه", "اها", "آها", "تمام", "زين", "طيب", "اوكي", "صح", "نعم", "إن شاء الله",
];
const INTERRUPT_PHRASES = [
  "stop", "wait", "hold on", "no", "nope", "actually", "but", "sorry", "excuse me",
  "لا", "لحظة", "استنى", "انتظر", "بس", "لحظه", "عفوا", "دقيقة",
];

export function getPhoneTurnTaking() {
  return {
    startSpeakingPlan: {
      // Minimum pause; the transcriber's own semantic end-of-turn decides
      // when the caller is actually done (fillers like "uhh" don't end a turn).
      waitSeconds: 0.2,
    },
    stopSpeakingPlan: {
      numWords: 1,
      voiceSeconds: 0.2,
      backoffSeconds: 0.8,
      acknowledgementPhrases: ACK_PHRASES,
      interruptionPhrases: INTERRUPT_PHRASES,
    },
    backgroundSpeechDenoisingPlan: { smartDenoisingPlan: { enabled: true } },
    backgroundSound: "off" as const,
  };
}

// ── Prompt ───────────────────────────────────────────────────────────────────
export interface PhoneCallerInfo {
  number: string | null;
  reliable: boolean;
}

type Service = { name?: string; price?: string; duration?: string; description?: string };

function compactServices(services: Service[]): string {
  return services
    .filter((s) => s?.name)
    .slice(0, 30)
    .map((s) => [s.name, s.price, s.duration].filter(Boolean).join(", "))
    .join("; ");
}

function last4(n: string): string {
  const d = n.replace(/\D/g, "");
  return d.slice(-4);
}

export function buildReceptionistPrompt(p: {
  agentName: string;
  businessName: string;
  kb: Record<string, any>;
  settings: Record<string, any>;
  nowText: string;
  bookedSlotsText?: string;
  caller?: PhoneCallerInfo | null;
}): string {
  const services = (p.kb.services as Service[] | undefined) ?? [];
  const biz = (p.kb.business as Record<string, string> | undefined) ?? {};
  const extra = ((p.kb.extra as string | undefined) ?? "").replace(/\s+/g, " ").trim().slice(0, 1200);
  const personality = (p.settings.personality as string | undefined) ?? "friendly";
  const ownerLang = (p.settings.language as string | undefined) ?? "";
  const custom = ((p.settings.customInstructions as string | undefined) ?? "").trim();

  const tone =
    personality === "professional" ? "polished and calm"
    : personality === "persuasive" ? "warm and gently encouraging"
    : personality === "concise" ? "warm but very brief"
    : "warm, friendly and relaxed";

  const facts = [
    p.nowText,
    `Business: ${p.businessName}`,
    services.length ? `Services: ${compactServices(services)}` : "Services: not listed yet",
    biz.hours ? `Hours: ${biz.hours}` : "",
    biz.address ? `Location: ${biz.address}` : "",
    biz.bookingPolicy ? `Booking policy: ${biz.bookingPolicy}` : "",
    extra ? `Notes: ${extra}` : "",
    (p.bookedSlotsText ?? "").trim() ? `Busy times (already booked): ${(p.bookedSlotsText ?? "").replace(/\n+/g, " ").trim()}` : "",
  ].filter(Boolean).join("\n");

  const caller = p.caller;
  const callbackRule = caller?.reliable && caller.number
    ? `The caller ID is ${caller.number}. When you need their number, ask naturally if it's the best number to reach them, the one ending in ${last4(caller.number)} (say the four digits one by one, in their language). If yes, use ${caller.number}. If not, ask for the right one and read it back in small groups.`
    : `The caller ID is hidden or not usable. When you need their number, ask for it and read it back in small groups to confirm.`;

  const languageRule = ownerLang && ownerLang !== "en" && ownerLang !== "ar"
    ? `The business prefers ${ownerLang}, but always answer in the language the caller actually speaks.`
    : "";

  return `You are ${p.agentName}, the receptionist answering the phone for ${p.businessName}. Sound like a real person at the front desk: ${tone}. Never like a bot.

# Facts
${facts}

# Language
- Answer in the caller's language AND dialect from their first words. Gulf Arabic callers get natural Gulf Arabic (هلا، حياك، شلون، وش، زين، إن شاء الله). Egyptian, Levantine, English, Hindi or Urdu callers get their own.
- If they switch language or mix Arabic and English, follow them smoothly. Never ask which language they prefer.
${languageRule}
# How you talk
- One or two short sentences per turn, then stop and listen.
- Ask one question at a time. Never read out lists; mention at most two options, like a person would.
- Small natural reactions are good ("mm", "okay", "sure", "تمام", "أكيد", "زين"), but vary them.
- If they laugh, react warmly. If they hesitate or say "uhh", give them a moment and help gently. Never rush them.
- Once you know their name, use it now and then.
- Say times and numbers the way people talk ("four thirty in the afternoon", "الساعة أربع ونص العصر"). Read phone numbers in small groups.
- Never invent prices, services, times or facts. If someone asks directly whether you are a real person or an AI, answer honestly.

# Call flow
1. You already greeted them. Find out how you can help.
2. Get their name early, naturally.
3. Understand the need: a specific service, or a problem they describe (then suggest the service that fits, from the list only).
4. To book: agree on a day and time inside the hours and not in the busy times. ${callbackRule} Then repeat the key details once and ask "shall I book it?". After a clear yes, say a short "one moment" and call ${BOOK_APPOINTMENT_TOOL} (date YYYY-MM-DD, time HH:MM 24h). Tell them exactly what the result says; if the time is taken, offer the alternatives it gives.
5. If you don't know the answer: don't guess. Offer to take a message (their name, the confirmed number, the message) and say the team will call them back.
6. Before saying goodbye, sum up in one sentence what happens next.
${custom ? `\n# Owner's rules\n${custom}\n` : ""}`;
}

// ── First message (static, spoken instantly; no LLM round trip) ──────────────
export function buildGreeting(businessName: string, settings: Record<string, any>): string {
  const customGreeting = ((settings.customGreeting as string | undefined) ?? "").trim();
  if (settings.greetingStyle === "custom" && customGreeting) return customGreeting;
  const lang = ((settings.greetingLanguage as string | undefined) || "").toLowerCase();
  const pick = (opts: string[]) => opts[Math.floor(Math.random() * opts.length)];
  if (lang === "ar") {
    return pick([
      `هلا والله، حياك الله في ${businessName}. شلون أقدر أخدمك؟`,
      `أهلًا وسهلًا، ${businessName}. تفضل، شلون أقدر أساعدك؟`,
    ]);
  }
  if (lang === "en") {
    return pick([
      `Hi, thanks for calling ${businessName}. How can I help you today?`,
      `Hello, ${businessName}, how can I help?`,
    ]);
  }
  if (lang === "fr") return `Bonjour, ${businessName}, comment puis-je vous aider ?`;
  if (lang === "es") return `Hola, ${businessName}, ¿en qué puedo ayudarle?`;
  if (lang === "de") return `Hallo, ${businessName}, wie kann ich Ihnen helfen?`;
  // "ar_en" or unset, the default for Qatar: a short Gulf Arabic welcome, then English.
  return pick([
    `هلا، حياك الله في ${businessName}. Hi, how can I help you today?`,
    `أهلًا وسهلًا في ${businessName}. Hello, how can I help?`,
  ]);
}

// ── Whole assistant ──────────────────────────────────────────────────────────
export function buildPhoneAssistant(p: {
  agentName: string;
  businessName: string;
  kb: Record<string, any>;
  settings: Record<string, any>;
  nowText: string;
  bookedSlotsText?: string;
  caller?: PhoneCallerInfo | null;
  server: VapiServerConfig;
  name?: string;
}) {
  const services = (p.kb.services as Service[] | undefined) ?? [];
  const turn = getPhoneTurnTaking();
  return {
    ...(p.name ? { name: p.name } : {}),
    model: {
      ...PHONE_LLM,
      maxTokens: 180,
      messages: [{ role: "system", content: buildReceptionistPrompt(p) }],
      tools: [buildBookAppointmentTool(p.server)],
    },
    voice: getPhoneVoiceConfig(p.settings.voiceId as string | undefined, p.settings.speed as number | undefined),
    transcriber: getPhoneTranscriberConfig(buildKeyterms(p.businessName, services), p.settings.language as string | undefined),
    firstMessage: buildGreeting(p.businessName, p.settings),
    firstMessageMode: "assistant-speaks-first" as const,
    firstMessageInterruptionsEnabled: true,
    ...turn,
    ...CALL_LIMITS,
    server: p.server,
  };
}

// ── Browser test calls (Overview, Training) ──────────────────────────────────
// Same LLM, voice, transcriber and turn-taking as a real call, so the owner
// hears what callers hear. Each page keeps its own prompt, tools and spoken
// opening: those are different jobs from answering the phone. maxTokens stays
// at Vapi's default because interview tool calls carry longer arguments.
export function buildBrowserCallAssistant(p: {
  systemPrompt: string;
  tools?: unknown[];
  voiceId?: string;
  speed?: number;
  businessName?: string;
  services?: Array<{ name?: string }>;
  language?: string;
}) {
  return {
    model: {
      ...PHONE_LLM,
      messages: [{ role: "system", content: p.systemPrompt }],
      ...(p.tools ? { tools: p.tools } : {}),
    },
    voice: getPhoneVoiceConfig(p.voiceId, p.speed),
    transcriber: getPhoneTranscriberConfig(buildKeyterms(p.businessName ?? "", p.services ?? []), p.language),
    firstMessageMode: "assistant-speaks-first-with-model-generated-message" as const,
    ...getPhoneTurnTaking(),
    ...CALL_LIMITS,
  };
}
