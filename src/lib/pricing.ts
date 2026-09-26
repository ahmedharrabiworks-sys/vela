export interface PlanFeature { text: string; included: boolean }

export interface Plan {
  id: "starter" | "pro" | "premium" | "custom";
  name: string;
  /** QAR, the base/display currency -- see src/lib/currency.ts to render in another currency. */
  monthly: number;
  /** QAR, discounted monthly rate when billed annually. */
  annual: number;
  popular: boolean;
  isCustom?: boolean;
  cta: string;
  description: string;
  highlightFeatures: string[];
  features: PlanFeature[];
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthly: 500,
    annual: 400,
    popular: false,
    cta: "Get Started",
    description: "Get your AI agent live on one channel and start handling leads automatically.",
    highlightFeatures: [
      "1 channel (phone, Instagram, or WhatsApp)",
      "500 text messages/mo",
      "Instant support",
    ],
    features: [
      { text: "500 AI-handled text messages/month",         included: true  },
      { text: "1 channel (phone, Instagram, or WhatsApp)",  included: true  },
      { text: "1 team member with dashboard access",        included: true  },
      { text: "Up to 50 bookings/month",                    included: true  },
      { text: "Instant AI-powered support, 24/7",           included: true  },
      { text: "Single AI training interview to get started", included: true  },
      { text: "AI Voice Phone Agent",                       included: false },
      { text: "Follow-up automation",                       included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 1500,
    annual: 1200,
    popular: true,
    cta: "Get Started",
    description: "The complete system, AI phone agent, all channels, website, and full CRM.",
    highlightFeatures: [
      "AI Voice Phone Agent",
      "All 3 channels (phone, Instagram, WhatsApp)",
      "Unlimited messages · 550 voice min/mo",
      "Instant support",
    ],
    features: [
      { text: "AI Voice Phone Agent, answers & books calls 24/7", included: true },
      { text: "All 3 channels (phone, Instagram, WhatsApp)",      included: true },
      { text: "550 voice minutes/month included",                included: true },
      { text: "Unlimited AI-handled text messages",               included: true },
      { text: "Unlimited team members, no per-seat limits",       included: true },
      { text: "Instant AI-powered support, 24/7, plus live chat with our team", included: true },
      { text: "Unlimited AI training edits, retrain anytime",     included: true },
      { text: "Guided onboarding, a real walkthrough with our team", included: true },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    monthly: 3000,
    annual: 2400,
    popular: false,
    cta: "Get Started",
    description: "For businesses that demand zero compromise, priority everything, 3 websites, unlimited team.",
    highlightFeatures: [
      "All 3 channels + priority routing",
      "1,000 voice minutes · Unlimited messages",
      "Instant support + dedicated account contact",
      "Done-for-you onboarding",
    ],
    features: [
      { text: "1,000 voice minutes/month included",         included: true },
      { text: "All 3 channels + priority message routing",  included: true },
      { text: "AI Voice Phone Agent + priority retraining", included: true },
      { text: "Unlimited AI-handled text messages",          included: true },
      { text: "Unlimited team members, no per-seat limits", included: true },
      { text: "Instant AI-powered support, 24/7, plus a dedicated account contact", included: true },
      { text: "Done-for-you onboarding, we set it all up for you", included: true },
    ],
  },
  {
    id: "custom",
    name: "Custom",
    monthly: 1500,
    annual: 1500,
    popular: false,
    isCustom: true,
    cta: "Talk to us",
    description: "White-glove setup, negotiated volume, dedicated account manager, and SLA guarantees.",
    highlightFeatures: [
      "Negotiated voice volume",
      "Unlimited websites + white-label",
      "Dedicated account manager + SLA",
      "White-glove onboarding + training",
    ],
    features: [
      { text: "Negotiated voice minutes",                  included: true },
      { text: "Unlimited text messages",                   included: true },
      { text: "All channels + custom integrations",        included: true },
      { text: "AI Voice Phone Agent + dedicated tuning",   included: true },
      { text: "Unlimited websites",                        included: true },
      { text: "Unlimited team members",                    included: true },
      { text: "Full CRM + white-label",                    included: true },
      { text: "SSO + security review available",           included: true },
      { text: "Account manager + SLA",                     included: true },
      { text: "White-glove onboarding + training",         included: true },
    ],
  },
];
