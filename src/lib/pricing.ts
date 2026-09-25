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
      { text: "500 text messages/month",                   included: true  },
      { text: "1 channel (phone, Instagram, or WhatsApp)", included: true  },
      { text: "1 team member",                              included: true  },
      { text: "Instant support",                            included: true  },
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
      "2,500 messages · 500 voice min/mo",
      "Instant support",
    ],
    features: [
      { text: "AI Voice Phone Agent",                        included: true },
      { text: "All 3 channels (phone, Instagram, WhatsApp)", included: true },
      { text: "500 voice minutes/month",                     included: true },
      { text: "2,500 text messages/month",                   included: true },
      { text: "3 team members",                              included: true },
      { text: "Instant support",                              included: true },
      { text: "Unlimited AI training edits",                 included: true },
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
      "800 voice minutes · 3,000 messages/mo",
      "Instant support + dedicated account contact",
      "Done-for-you onboarding",
    ],
    features: [
      { text: "800 voice minutes/month",                    included: true },
      { text: "All 3 channels + priority routing",          included: true },
      { text: "AI Voice Phone Agent + priority retraining", included: true },
      { text: "3,000 text messages/month",                  included: true },
      { text: "Unlimited team members",                     included: true },
      { text: "Instant support + dedicated account contact", included: true },
      { text: "Done-for-you onboarding",                    included: true },
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
