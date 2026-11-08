/**
 * Single source of truth for all Vapi assistant configuration.
 * Verified against @vapi-ai/web@2.6.1 SDK types (node_modules/@vapi-ai/web/dist/api.d.ts).
 */

// ── Centralized voice list ────────────────────────────────────────────────────
export interface VoiceEntry {
  id: string;
  name: string;
  description: string;
  gender: "male" | "female";
}

export const VOICES: VoiceEntry[] = [
  // Male
  { id: "HKFOb9iktHA85uKXydRT", name: "Mateo",     description: "Smooth and confident, clear delivery",       gender: "male" },
  { id: "Qrl71rx6Yg8RvyPYRGCQ", name: "Théo",      description: "Warm and expressive, natural ease",          gender: "male" },
  { id: "Czw3Dn181ypdrCOnPfif", name: "Felix",     description: "Crisp and measured, calm authority",         gender: "male" },
  { id: "TUKJhQmz3RPYBNAgC5A1", name: "Miles",     description: "Natural and grounded, easy to trust",        gender: "male" },
  { id: "DANw8bnAVbjDEHwZIoYa", name: "Sami",      description: "Deep and resonant, commanding presence",     gender: "male" },
  // Female
  // Gulf Arabic receptionist voices (ElevenLabs library, Saudi/Gulf accent,
  // conversational). Heba is the phone agent's default (vapi-phone-assistant.ts).
  { id: "QsV9PCczMIklRM6xLPAS", name: "Heba",      description: "Gulf Arabic receptionist, warm and clear",   gender: "female" },
  { id: "gVzwmdZzRgBrNjXaTmi5", name: "Layan",     description: "Gulf Arabic, polished and professional",     gender: "female" },
  { id: "Qggl4b0xRMiqOwhPtVWT", name: "Céline",    description: "Warm and articulate, engaging tone",         gender: "female" },
  { id: "FvmvwvObRqIHojkEGh5N", name: "Valentina", description: "Bright and confident, effortlessly clear",   gender: "female" },
  { id: "22VndfJPBU7AZORAZZTT", name: "Hanna",     description: "Precise and composed, professional warmth",  gender: "female" },
  { id: "iFSsEDGbm0FiEd2IVH4w", name: "Ava",       description: "Friendly and natural, easy to listen to",    gender: "female" },
  { id: "u0TsaWvt0v8migutHM3M", name: "Nour",      description: "Smooth and expressive, balanced tone",       gender: "female" },
];

// ── Default ElevenLabs voice ID (Heba, the receptionist voice) ────────────────
// Used whenever the owner hasn't saved a voice, on every surface.
export const DEFAULT_VOICE_ID = "QsV9PCczMIklRM6xLPAS";

// ── Default speaking speed ──────────────────────────────────────────────────────
export const DEFAULT_SPEED = 1.0;

// ── Call duration limits ──────────────────────────────────────────────────────
// Verified from @vapi-ai/web api.d.ts CreateAssistantDTO + AssistantOverrides:
//   maxDurationSeconds, @default 600 (10 min), @min 10, @max 43200
//   silenceTimeoutSeconds, NOT present on CreateAssistantDTO / AssistantOverrides;
//     it exists only on the transfer sub-assistant type and cannot be set here.
// Root cause of mid-call ejections: Vapi's 600s default was never overridden,
// so any call over 10 minutes was terminated with {"type":"ejected","msg":"Meeting has ended"}.
export const CALL_LIMITS = {
  maxDurationSeconds: 1800,  // 30 minutes
} as const;

// ── Speed clamp ───────────────────────────────────────────────────────────────
// ElevenLabs only accepts speed in [0.7, 1.2].
export function clampSpeed(speed: number): number {
  return Math.min(1.2, Math.max(0.7, speed));
}

// ── Shared web call error handling ─────────────────────────────────────────────
// Single source of truth for interpreting Vapi Web SDK "error" events, used by
// both the Overview "Talk to Vela" call and the Training interview call. Before
// this was centralized, each page had its own copy that had drifted: neither
// correctly recognized the real shape Vapi's underlying Daily.co transport sends
// for an ejection, which is nested two levels deep, e.g.
//   { type: "daily-error", error: { error: { type: "ejected", msg: "..." } } }
// Overview's old check only looked at e.type / e.error.type (one level), so it
// never matched and fell through to a fully generic "unexpected error" message.
// Training's old check didn't recognize ejections as a distinct case at all, so
// it fell through to a raw JSON.stringify of the whole event.
/* eslint-disable @typescript-eslint/no-explicit-any */
export function isVapiEjection(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const anyE = e as Record<string, any>;
  if (anyE.type === "ejected") return true;
  const err = anyE.error;
  if (err && typeof err === "object") {
    if (err.type === "ejected") return true;
    if (err.error && typeof err.error === "object" && err.error.type === "ejected") return true;
    if (err.message && typeof err.message === "object" && err.message.type === "ejected") return true;
  }
  return false;
}

export function vapiErrorText(e: unknown): string {
  if (typeof e === "string") {
    if (e.startsWith("{") || e.startsWith("[")) {
      try { return JSON.stringify(JSON.parse(e)); } catch { return e; }
    }
    return e;
  }
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const anyE = e as Record<string, any>;
    if (typeof anyE.message === "string") return anyE.message;
    if (typeof anyE.msg === "string") return anyE.msg;
    if (typeof anyE.error === "string") return anyE.error;
    if (anyE.error && typeof anyE.error === "object") {
      const inner = anyE.error as Record<string, any>;
      if (typeof inner.message === "string") return inner.message;
      if (typeof inner.msg === "string") return inner.msg;
      if (typeof inner.errorMsg === "string") return inner.errorMsg;
      // Daily.co shape: error.error.msg / error.message.msg (one level deeper)
      if (inner.error && typeof inner.error === "object" && typeof inner.error.msg === "string") return inner.error.msg;
      if (inner.message && typeof inner.message === "object" && typeof inner.message.msg === "string") return inner.message.msg;
    }
    try { return JSON.stringify(e); } catch { /* ignore */ }
  }
  return "An unexpected error occurred. Please try again.";
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Microphone pre-flight check ────────────────────────────────────────────
// The Vapi Web SDK creates its Daily.co call with audioSource:true by default,
// but if the browser's getUserMedia request is denied, blocked at the OS level,
// or resolves to a device with no real input, nothing about the call session
// itself fails -- the WebRTC connection stays healthy and Vapi never ejects, so
// the call looks fully "active" while the assistant receives zero audio and can
// never respond to anything said. Requesting the mic ourselves before starting
// the call surfaces a specific, actionable error immediately instead of a
// silent one-way call. Used by both the Overview and Training call flows.
export async function requestMicrophoneAccess(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return { ok: true };
  } catch (err: unknown) {
    const name = (err as { name?: string } | undefined)?.name;
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return { ok: false, message: "Microphone access is blocked. Allow microphone access for this site in your browser settings, then try again." };
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return { ok: false, message: "No microphone found. Connect a microphone and try again." };
    }
    return { ok: false, message: "Couldn't access your microphone. Check your browser's microphone permissions and try again." };
  }
}

// ── Language name map (shared) ────────────────────────────────────────────────
const LANG_NAMES: Record<string, string> = {
  ar: "Arabic (العربية)",
  fr: "French (Français)",
  de: "German (Deutsch)",
  es: "Spanish (Español)",
  en: "English",
};

// ── Inbound phone agent ───────────────────────────────────────────────────────
// The real phone receptionist (prompt, voice, transcriber, turn-taking) lives in
// src/lib/vapi-phone-assistant.ts (v2). The previous builder is preserved at git
// tag voice-v1.

// ── Training context (optional, makes questions smarter when available) ──────
export interface TrainingContext {
  businessName?: string;
  industry?: string;
  city?: string;
  // topic key → human-readable summary of what's already on file
  existingKb?: Partial<Record<"businessAndCustomers" | "availability" | "locationArea" | "rulesEscalation" | "brandVoice", string>>;
}

// ── Training interview system prompt ──────────────────────────────────────────
export function buildTrainingSystem(savedLanguage?: string, ctx?: TrainingContext): string {
  const langSetup =
    savedLanguage === "ar"
      ? `The owner's preferred language is Arabic (العربية). Open IMMEDIATELY in Arabic with question 1. Do NOT say "مرحبا", use a varied, natural Arabic opener or go straight to your first question. Never open the same way twice.`
    : savedLanguage && savedLanguage !== "en"
      ? `The owner's preferred language is already set to ${LANG_NAMES[savedLanguage] ?? savedLanguage}. Open IMMEDIATELY in ${LANG_NAMES[savedLanguage] ?? savedLanguage} with question 1, do NOT ask about language preferences. Vary your opening, never open with the same phrase twice.`
    : savedLanguage === "en"
      ? `The owner's preferred language is English. Open immediately with question 1 in English, do NOT ask about language preferences.`
      : `Detect the owner's language from their very first words, do NOT ask which language they prefer.
Arabic (العربية) is your HIGHEST priority: if you hear or read any Arabic at all, even a single word, respond in Arabic IMMEDIATELY and stay in Arabic for the entire interview.
IMPORTANT: If the transcription reads "Arabia" or "Arabia Arabia", that is a speech-to-text artifact for the Arabic word "عربي", treat it as Arabic and switch to Arabic immediately.
Supported languages: Arabic (العربية), French (Français), German (Deutsch), Spanish (Español), English. Match the owner's language from their very first message.`;

  // ── Context injection ──────────────────────────────────────────────────────
  const hasCtxInfo = !!(ctx?.businessName || ctx?.industry || ctx?.city);
  const contextSection = hasCtxInfo
    ? [
        "## BUSINESS CONTEXT (already known, use this)",
        ctx?.businessName ? `Business name: ${ctx.businessName}` : "",
        ctx?.industry     ? `Industry: ${ctx.industry}`           : "",
        ctx?.city         ? `City: ${ctx.city}`                   : "",
      ].filter(Boolean).join("\n")
    : "";

  const TOPIC_LABELS: Record<string, string> = {
    businessAndCustomers: "business & customers",
    availability:         "availability & schedule",
    locationArea:         "location & service area",
    rulesEscalation:      "rules, escalation & handoff",
    brandVoice:           "brand voice & conversation style",
  };
  const knownEntries = Object.entries(ctx?.existingKb ?? {}).filter(([, v]) => v?.trim());
  const existingSection = knownEntries.length > 0
    ? [
        "## ALREADY ON FILE, confirm these; do not ask them fresh",
        ...knownEntries.map(([k, v]) => `- ${TOPIC_LABELS[k] ?? k}: "${v}"`),
        "",
        `For each topic above: say "I have your [label] on file as '[value]', still accurate?" Then call recordBusinessAnswer with the confirmed or corrected value (apply NORMALIZATION as usual). If they confirm without changes, record the stored value as-is.`,
        `For topics NOT listed here: ask the corresponding question from INTERVIEW QUESTIONS.`,
      ].join("\n")
    : "";

  const businessNameForGreeting = ctx?.businessName?.trim() || "your business";

  return `You are Vela, interviewing a business owner to build their AI knowledge base so you can handle their customer calls. Keep it conversational and quick. One question at a time.

## LANGUAGE (STRICT, READ FIRST)
${langSetup}
Once the language is established: stay in it for the ENTIRE interview, no exceptions.
IMPORTANT: Topic keys (businessAndCustomers, availability, locationArea, rulesEscalation, brandVoice) are internal identifiers only, ask all questions and give all responses in the established language.
CRITICAL: If the owner types an answer instead of speaking, respond in the SAME language. Arabic typed → Arabic response. French typed → French response. Never deviate.

## OPENING, MANDATORY
Your very first sentence must greet the owner by name-dropping their business: "${businessNameForGreeting}". For example: "Hi, I'm Vela, let's get ${businessNameForGreeting} set up." Vary your exact wording every session, never repeat the same opening twice. Immediately after the greeting, move straight into question 1 (or the first ALREADY ON FILE confirmation, if any).
${contextSection ? "\n" + contextSection + "\n" : ""}${existingSection ? "\n" + existingSection + "\n" : ""}
## INTERVIEW QUESTIONS (ask in this exact order, one at a time)
Keep each question conversational and clear. Do not include extra examples beyond what's written unless the owner is vague. If an answer is vague, ask ONE brief follow-up with a short example, then move on.${knownEntries.length > 0 ? "\nFor any topic ALREADY ON FILE above: confirm its value instead of asking the question fresh." : ""}

1. Business & Customers, Ask: "What does your business do, who do you serve, and what should the agent know about your business?"

2. Availability & Schedule, Ask: "What are your opening hours, appointment availability, holidays, and unavailable times?"

3. Location & Service Area, Ask: "Where are you located? Do you serve customers remotely, at their location, or within specific areas?"

4. Rules, Escalation & Handoff, Ask: "What should the agent never say or do? When should it transfer the call, take a message, or escalate to a human?"

5. Brand Voice & Conversation Style, Ask: "How should the agent sound? What tone, personality, language, and communication style should it use?"

## VALIDATION, apply before calling recordBusinessAnswer
VALID, record immediately:
- businessAndCustomers: any description of what the business does, who it serves, or general context about it
- availability: any hours, appointment availability, holidays, or unavailable-times info in any form
- locationArea: any location or service-area info, including "we go to clients", "online only", or specific cities/regions
- rulesEscalation: any rule, restriction, or transfer/handoff/escalation instruction, even a single example
- brandVoice: any description of tone, personality, language, or communication style

NON-ANSWERS, do NOT record; ask the same question again with a different example:
Greetings only ("hi", "hello", "yes", "ok", "fine"), pure negatives ("no", "nothing", "I don't know"), or vague non-info ("a lot", "everything", "it depends", "whatever works").

VAGUE but not empty, ask ONE short follow-up with a brief example, then accept their next answer:
"We do a bit of everything" → "Like what, give me two or three examples?"
"Normal hours" → "What hours exactly, like 9am to 6pm, Monday to Friday?"
"Be professional" → "Anything more specific, formal and concise, or warm and friendly?"

## NORMALIZATION, always store the clean version, never raw transcript
Availability: convert to standard format before storing.
  "mon to sat 9 to 5" → "Mon to Sat 9:00 to 17:00, closed Sundays"
  "every day 8am to 8pm, closed on holidays" → "Daily 8:00 to 20:00, closed on public holidays"
Keep each stored answer a few clear, complete sentences, normalized, never a raw transcript dump.

## TOPIC KEYS (use these exactly as the "topic" argument to recordBusinessAnswer)
businessAndCustomers, availability, locationArea, rulesEscalation, brandVoice

## CLOSING
After all 5 topics are recorded or confirmed: give a confident 2 to 3 sentence summary of the business using NORMALIZED data, then say you are ready to start handling their calls.`;
}

// ── Training function-call tool definition ────────────────────────────────────
export const RECORD_ANSWER_TOOL = {
  type: "function" as const,
  async: true,
  function: {
    name: "recordBusinessAnswer",
    description:
      "Record a confirmed, complete answer for one training topic. ONLY call this when you have a real, substantive answer, never for greetings, single-word replies, or vague non-info like 'a lot' or 'I don't know'. Always store the NORMALIZED version: availability as 'Mon to Sat 9:00 to 17:00', clean full sentences, never a raw transcript dump.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: [
            "businessAndCustomers",
            "availability",
            "locationArea",
            "rulesEscalation",
            "brandVoice",
          ],
          description: "The KB topic key this answer belongs to.",
        },
        value: {
          type: "string",
          description:
            "The NORMALIZED, clean summary, not raw transcript. Availability must be in 'Mon to Sat 9:00 to 17:00' format when hours are given. Write as clear, complete sentences.",
        },
      },
      required: ["topic", "value"],
    },
  },
};
