/**
 * Single source of truth for all Vapi assistant configuration.
 * Verified against @vapi-ai/web@2.6.1 SDK types (node_modules/@vapi-ai/web/dist/api.d.ts).
 */

// ── Default ElevenLabs voice ID ───────────────────────────────────────────────
export const DEFAULT_VOICE_ID = "PIGsltMj3gFMR34aFDI3";

// ── Speed clamp ───────────────────────────────────────────────────────────────
// ElevenLabs only accepts speed in [0.7, 1.2].
export function clampSpeed(speed: number): number {
  return Math.min(1.2, Math.max(0.7, speed));
}

// ── Transcriber ───────────────────────────────────────────────────────────────
// Deepgram nova-3 with language: "multi" for multilingual auto-detection.
// "nova-3" is confirmed in the DeepgramTranscriber model union (api.d.ts:238).
// "multi" is confirmed in the language union (api.d.ts:240).
// NOTE: if nova-3 causes silent 3s termination on Vapi's managed Deepgram account,
// fall back to "nova-2-conversationalai" — but only after verifying in production.
export function getTranscriberConfig() {
  return {
    provider: "deepgram" as const,
    model: "nova-3" as const,
    language: "multi" as const,
    smartFormat: false,
  };
}

// ── Speaking plan (barge-in / interruption) ───────────────────────────────────
// stopSpeakingPlan tunes how aggressively the assistant stops on interruption.
// firstMessageInterruptionsEnabled: true is set at each call-site (it is a
// top-level CreateAssistantDTO field, not part of these plans).
export function getSpeakingPlanConfig() {
  return {
    stopSpeakingPlan: {
      numWords: 0,
      voiceSeconds: 0.1,
      backoffSeconds: 0.3,
    },
    startSpeakingPlan: {
      waitSeconds: 0.3,
      smartEndpointingPlan: { provider: "vapi" as const },
    },
  };
}

// ── Shared voice config builder ───────────────────────────────────────────────
export function getVoiceConfig(voiceId: string, speed: number) {
  return {
    provider: "11labs" as const,
    voiceId,
    model: "eleven_multilingual_v2" as const,
    stability: 0.45,
    similarityBoost: 0.8,
    style: 0.25,
    useSpeakerBoost: true,
    speed: clampSpeed(speed),
  };
}

// ── Language-aware first messages ─────────────────────────────────────────────
const LANG_GREETINGS: Record<string, string> = {
  ar: "مرحباً! أنا فيلا، مساعدتك التجارية. كيف يمكنني مساعدتك اليوم؟",
  fr: "Bonjour ! Je suis Vela, votre assistante. Comment puis-je vous aider aujourd'hui ?",
  de: "Hallo! Ich bin Vela, Ihre KI-Assistentin. Wie kann ich Ihnen heute helfen?",
  es: "¡Hola! Soy Vela, tu asistente. ¿En qué puedo ayudarte hoy?",
  en: "Hey — good to have you. What's on your mind?",
};

// preferredLanguage undefined → first ever call, ask for language preference.
// preferredLanguage set → greet directly in that language.
export function getAssistantFirstMessage(preferredLanguage?: string): string {
  if (!preferredLanguage) {
    return "Hey — welcome! Which language would you like to use for our conversations?";
  }
  return LANG_GREETINGS[preferredLanguage] ?? LANG_GREETINGS.en;
}

const TRAINING_GREETINGS: Record<string, string> = {
  ar: "مرحباً! سأتعلم عن عملك من خلال محادقة قصيرة. لنبدأ — ما نوع عملك ومن هم عملاؤك؟",
  fr: "Bonjour ! Je vais apprendre à connaître votre activité. Pour commencer — que fait votre entreprise et qui sont vos clients ?",
  de: "Hallo! Ich lerne Ihr Unternehmen kennen. Zunächst — was macht Ihr Unternehmen und wer sind Ihre Kunden?",
  es: "¡Hola! Voy a aprender sobre tu negocio. Para empezar — ¿qué hace tu empresa y quiénes son tus clientes típicos?",
  en: "Hi! I'm going to learn about your business so I can answer your customer calls. To start — what does your business do, and who are your typical customers?",
};

// preferredLanguage undefined → no language saved, ask first.
// preferredLanguage set → open directly in that language with the first question.
export function getTrainingFirstMessage(preferredLanguage?: string): string {
  if (!preferredLanguage) {
    return "Hi! I'll learn about your business through a short conversation. Which language would you like to use?";
  }
  return TRAINING_GREETINGS[preferredLanguage] ?? TRAINING_GREETINGS.en;
}

// ── Inbound call system prompt ────────────────────────────────────────────────
export function buildInboundSystem(
  agentName: string,
  businessName: string,
  kb: Record<string, unknown>,
  settings: Record<string, unknown>
): string {
  const services =
    (kb.services as Array<{ name: string; price?: string }> | undefined) ?? [];
  const biz = (kb.business as Record<string, string> | undefined) ?? {};
  const extra = (kb.extra as string | undefined) ?? "";
  const personality = (settings.personality as string | undefined) ?? "professional";
  const greetingStyle = (settings.greetingStyle as string | undefined) ?? "warm";
  const customInstructions = (settings.customInstructions as string | undefined) ?? "";
  const language = (settings.language as string | undefined) ?? "";

  const svcList = services.length > 0
    ? services.map((s) => `${s.name}${s.price ? ` (${s.price})` : ""}`).join(", ")
    : "";

  const greetingInstruction = greetingStyle === "pro"
    ? `Greet the caller in a polished, professional tone — reference ${businessName} naturally. Keep it brief — one short sentence, then listen.`
    : `Greet the caller warmly and in a friendly way — mention ${businessName} naturally. One short sentence, then let them speak.`;

  const personalityLine = personality === "professional"
    ? "Formal, precise, and business-focused."
    : personality === "friendly"
    ? "Warm, approachable — build rapport quickly."
    : personality === "persuasive"
    ? "Confident, highlights value, gently drives action."
    : "Concise and efficient — respect the caller's time.";

  const languageInstruction = language && language !== "en"
    ? `Always speak in ${language === "ar" ? "Arabic (العربية)" : language === "fr" ? "French" : language === "de" ? "German" : language === "es" ? "Spanish" : language} throughout the entire call. Never switch languages.`
    : "Detect the caller's language from their first words and respond in it immediately. Support Arabic (العربية), French, German, Spanish, and English. Never mix languages mid-call.";

  return `You are ${agentName}, the AI phone agent for ${businessName}. You handle inbound calls professionally, answer questions, and help callers book appointments.

## OPENING
${greetingInstruction}
Do NOT recite a fixed script. Vary your phrasing naturally call to call, like a real person would.

## LANGUAGE RULE
${languageInstruction}

## BUSINESS KNOWLEDGE
${svcList ? `Services: ${svcList}` : "No services listed — tell callers to ask about what you offer."}
${biz.hours ? `Hours: ${biz.hours}` : ""}
${biz.address ? `Location: ${biz.address}` : ""}
${biz.bookingPolicy ? `Booking policy: ${biz.bookingPolicy}` : ""}
${extra ? `Additional info: ${extra}` : ""}

## CALL FLOW
1. Open warmly (see OPENING above)
2. Understand what the caller needs
3. Answer questions using your business knowledge
4. If they want to book: collect their name, preferred date/time, and service — confirm back to them in full before ending
5. Close warmly — let them know what happens next

## PERSONALITY
${personalityLine}

${customInstructions ? `## CUSTOM RULES\n${customInstructions}\n` : ""}## RULES
- Never invent information not in your knowledge above
- Keep responses short — this is a phone call, not a chat
- Never mention you are AI unless directly asked
- Always confirm booking details back to the caller before ending the call`;
}

// ── Training system prompt ────────────────────────────────────────────────────
export const TRAINING_SYSTEM = `You are Vela — an AI having a short training conversation with a business owner to learn about their business.

## YOUR GOAL
Cover 7 topics through natural, plain conversation. One topic at a time. If the answer is too short or unclear, ask one simple follow-up before moving on.

## TOPICS (in order)
1. businessType — What the business does and who their typical customers are
2. services — What services or products they offer, and rough prices
3. hours — What days and hours they're open
4. location — Where they are; do customers come to them or do they go to customers?
5. booking — How customers book or get in touch
6. faqs — The most common things callers ask about
7. special — What makes this business stand out from similar ones nearby

## CAPTURING ANSWERS
When you get a clear, real answer for a topic:
- Call recordBusinessAnswer with the topic key and a clean summary of their answer
- Do NOT record greetings, language choices, or vague one-word replies — ask a follow-up first
- Write the summary in natural sentences, not raw transcript fragments

## LANGUAGE
If the owner responds in Arabic, French, German, Spanish, or any other language — switch immediately and stay in that language for the whole conversation.

## STYLE
- One short, simple question at a time. No jargon
- Brief acknowledgment after each answer (one sentence), then next question
- These are real business owners — a restaurant owner, a salon, a gym. Keep it friendly and easy

## CLOSING
After all 7 topics are recorded: give a confident 2–3 sentence summary of the business, then say you're ready to start handling their calls.`;

// ── Training function-call tool definition ────────────────────────────────────
export const RECORD_ANSWER_TOOL = {
  type: "function" as const,
  async: true,
  function: {
    name: "recordBusinessAnswer",
    description:
      "Record a confirmed, complete answer for one of the 7 training topics. Only call this when you have a real, substantive answer — never for greetings, language selections, or unclear replies.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: [
            "businessType",
            "services",
            "hours",
            "location",
            "booking",
            "faqs",
            "special",
          ],
          description: "The KB topic key this answer belongs to.",
        },
        value: {
          type: "string",
          description:
            "A clean, well-formed summary of the owner's answer — written in full sentences, not a raw transcript fragment.",
        },
      },
      required: ["topic", "value"],
    },
  },
};
