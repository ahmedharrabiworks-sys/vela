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

// ── Inbound phone agent ───────────────────────────────────────────────────────
// The real phone receptionist (prompt, voice, transcriber, turn-taking) lives in
// src/lib/vapi-phone-assistant.ts (v2). The previous builder is preserved at git
// tag voice-v1.

