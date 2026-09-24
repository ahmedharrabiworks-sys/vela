export interface PlanFeature { text: string; included: boolean }

export interface Plan {
  id: "starter" | "pro" | "premium" | "custom";
  name: string;
  monthly: number;
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
    monthly: 95,
    annual: 76,
    popular: false,
    cta: "Get Started",
    description: "Get your AI agent live on one channel and start handling leads automatically.",
    highlightFeatures: [
      "1 channel (phone, Instagram, or WhatsApp)",
      "500 text messages/mo",
      "Email support (48h)",
    ],
    features: [
      { text: "500 text messages/month",                   included: true  },
      { text: "1 channel (phone, Instagram, or WhatsApp)", included: true  },
      { text: "1 team member",                              included: true  },
      { text: "Email support (48h)",                        included: true  },
      { text: "AI Voice Phone Agent",                       included: false },
      { text: "Follow-up automation",                       included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 295,
    annual: 236,
    popular: true,
    cta: "Get Started",
    description: "The complete system, AI phone agent, all channels, website, and full CRM.",
    highlightFeatures: [
      "AI Voice Phone Agent",
      "All 3 channels (phone, Instagram, WhatsApp)",
      "1,500 messages · 300 voice min/mo",
      "Priority support (24h)",
    ],
    features: [
      { text: "AI Voice Phone Agent",                        included: true },
      { text: "All 3 channels (phone, Instagram, WhatsApp)", included: true },
      { text: "300 voice minutes/month",                     included: true },
      { text: "1,500 text messages/month",                   included: true },
      { text: "3 team members",                              included: true },
      { text: "Priority support (24h)",                      included: true },
      { text: "Unlimited AI training edits",                 included: true },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    monthly: 595,
    annual: 476,
    popular: false,
    cta: "Get Started",
    description: "For businesses that demand zero compromise, priority everything, 3 websites, unlimited team.",
    highlightFeatures: [
      "All 3 channels + priority routing",
      "700 voice minutes · 3,000 messages/mo",
      "Unlimited team members",
      "Done-for-you onboarding",
    ],
    features: [
      { text: "700 voice minutes/month",                    included: true },
      { text: "All 3 channels + priority routing",          included: true },
      { text: "AI Voice Phone Agent + priority retraining", included: true },
      { text: "3,000 text messages/month",                  included: true },
      { text: "Unlimited team members",                     included: true },
      { text: "Dedicated call + chat support",              included: true },
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
