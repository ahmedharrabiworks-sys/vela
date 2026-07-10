/**
 * Single source of truth for all Vapi assistant configuration.
 * Import from here instead of hardcoding in each page/route.
 *
 * Verified against @vapi-ai/web@2.6.1 SDK types (node_modules/@vapi-ai/web/dist/api.d.ts).
 */

// ── Default ElevenLabs voice ID used across all Vapi contexts ─────────────────
export const DEFAULT_VOICE_ID = "PIGsltMj3gFMR34aFDI3";

// ── Speed clamp ───────────────────────────────────────────────────────────────
// ElevenLabs only accepts speed in [0.7, 1.2]. Any value outside this range
// returns a 422 validation_error. Clamp here so no caller can accidentally send
// an out-of-range value regardless of what the slider or saved settings contain.
export function clampSpeed(speed: number): number {
  return Math.min(1.2, Math.max(0.7, speed));
}

// ── Transcriber ───────────────────────────────────────────────────────────────
// Deepgram nova-2 with language: "multi" for automatic multilingual detection.
// nova-2 is used (not nova-3) because nova-3 is too new for Vapi's managed
// Deepgram account in browser web-SDK calls, causing ~3s silent termination.
// nova-2 with "multi" is the production-proven multilingual option.
// "multi" is explicitly in the DeepgramTranscriber language union (api.d.ts:240).
export function getTranscriberConfig() {
  return {
    provider: "deepgram" as const,
    model: "nova-2" as const,
    language: "multi" as const,
    smartFormat: false,
  };
}

// ── Speaking plan (barge-in / interruption) ───────────────────────────────────
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
// Speed is clamped to [0.7, 1.2] — ElevenLabs' only valid range.
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
  const personality =
    (settings.personality as string | undefined) ?? "professional";
  const greetingStyle =
    (settings.greetingStyle as string | undefined) ?? "warm";
  const customInstructions =
    (settings.customInstructions as string | undefined) ?? "";

  const svcList =
    services.length > 0
      ? services
          .map((s) => `${s.name}${s.price ? ` (${s.price})` : ""}`)
          .join(", ")
      : "";

  const greetingInstruction =
    greetingStyle === "pro"
      ? `Greet the caller in a polished, professional tone — reference ${businessName} naturally. Keep it brief — one short sentence, then listen.`
      : `Greet the caller warmly and in a friendly way — mention ${businessName} naturally. One short sentence, then let them speak.`;

  const personalityLine =
    personality === "professional"
      ? "Formal, precise, and business-focused."
      : personality === "friendly"
      ? "Warm, approachable — build rapport quickly."
      : personality === "persuasive"
      ? "Confident, highlights value, gently drives action."
      : "Concise and efficient — respect the caller's time.";

  return `You are ${agentName}, the AI phone agent for ${businessName}. You handle inbound calls professionally, answer questions, and help callers book appointments.

## OPENING
${greetingInstruction}
Do NOT recite a fixed script. Vary your phrasing naturally call to call, like a real person would.

## LANGUAGE RULE
Detect the caller's language from their first words and respond in it immediately. Support all languages — especially Arabic (العربية), French, German, Spanish. Never mix languages within a call. If you cannot detect, default to English.

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
export const TRAINING_SYSTEM = `You are Vela — an AI phone agent having a structured training conversation with a business owner to learn their business thoroughly.

## YOUR GOAL
Cover 7 business topics through natural conversation. Ask ONE topic at a time. Listen carefully — if an answer is vague, off-topic, or a single word, ask a natural follow-up rather than recording garbage data.

## TOPICS TO COVER (in this order, one at a time)
1. businessType — What the business does and who their main customers are
2. services — Main services or products, with rough pricing
3. hours — Business hours and availability
4. location — Location: do customers come to you, or do you go to them?
5. booking — How customers book or get in touch
6. faqs — Common questions callers ask and how you answer them
7. special — What makes this business stand out from competitors

## CAPTURING ANSWERS — CRITICAL
After you receive a clear, complete answer for a topic (not a greeting, not a language selection, not a vague or off-topic reply):
- Call the recordBusinessAnswer function with the exact topic key and a clean, well-formed summary of their answer
- Do NOT call recordBusinessAnswer for trivial responses, greetings, or unclear answers — ask a follow-up instead
- Write the value in clean, natural sentences (not raw transcript fragments)

## LANGUAGE RULE
If the owner responds in Arabic, French, German, Spanish, or any other language — switch to it immediately and stay in it the entire conversation. Never mix languages.

## STYLE
- One question at a time — never combine two
- One brief acknowledgment after each answer (one sentence max), then the next question
- Conversational and warm, not robotic or scripted
- Do NOT say "Welcome" or "boss" — that is not your role here

## CLOSING
After all 7 topics are covered and recorded, give a confident 3–4 sentence business pitch based on their answers, then tell them you are ready to start handling their calls.`;

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
