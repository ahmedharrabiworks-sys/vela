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

// ── Inbound phone agent ───────────────────────────────────────────────────────
// The real phone receptionist (prompt, voice, transcriber, turn-taking) lives in
// src/lib/vapi-phone-assistant.ts (v2). The previous builder is preserved at git
// tag voice-v1.

