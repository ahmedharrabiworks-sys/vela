// Shared plan limits, no "use client" so this can be imported by both
// React client components (plans.ts) and server API routes (generate/route.ts).
// This is the SINGLE SOURCE OF TRUTH for per-plan limits.
// `price` is QAR (the base/display currency, see src/lib/currency.ts) and
// must stay in sync with the `monthly` field in src/lib/pricing.ts exactly
// -- both changed together in Phase 5.

export const PLAN_CONFIG = {
  starter: {
    price: 500,
    channels: 1,
    bookingsPerMonth: 50,
    customDomains: 0,
    websites: 0,
    voiceMinutes: 0,
    textMessages: 500,
    teamMembers: 1,
    multiLocation: 0,
    voiceAgent: false,
    analytics: false,
    followUps: false,
    whiteLabel: false,
    aiTraining: "generic" as const,
    support: "email" as const,
  },
  pro: {
    price: 1500,
    channels: 3,
    bookingsPerMonth: Infinity,
    customDomains: 1,
    websites: 1,
    voiceMinutes: 500,
    textMessages: 2500,
    teamMembers: 3,
    multiLocation: 2,
    voiceAgent: true,
    analytics: true,
    followUps: true,
    whiteLabel: true,
    aiTraining: "custom" as const,
    support: "liveChat" as const,
  },
  premium: {
    price: 3000,
    channels: 3,
    bookingsPerMonth: Infinity,
    customDomains: 3,
    websites: 3,
    voiceMinutes: 800,
    textMessages: 3000,
    teamMembers: Infinity,
    multiLocation: Infinity,
    voiceAgent: true,
    analytics: true,
    followUps: true,
    whiteLabel: true,
    aiTraining: "advanced" as const,
    support: "dedicated" as const,
  },
  custom: {
    price: 1500,
    channels: Infinity,
    bookingsPerMonth: Infinity,
    customDomains: Infinity,
    websites: Infinity,
    voiceMinutes: Infinity,
    textMessages: Infinity,
    teamMembers: Infinity,
    multiLocation: Infinity,
    voiceAgent: true,
    analytics: true,
    followUps: true,
    whiteLabel: true,
    aiTraining: "advanced" as const,
    support: "dedicated" as const,
  },
} as const;

export type PlanId = keyof typeof PLAN_CONFIG;
