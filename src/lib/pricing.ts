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
      "150 voice minutes · 500 messages/mo",
      "View-only CRM",
      "Email support (48h)",
    ],
    features: [
      { text: "150 voice minutes/month",                   included: true  },
      { text: "500 text messages/month",                   included: true  },
      { text: "1 channel (phone, Instagram, or WhatsApp)", included: true  },
      { text: "1 team member",                              included: true  },
      { text: "View-only CRM",                              included: true  },
      { text: "Basic analytics",                            included: true  },
      { text: "Email support (48h)",                        included: true  },
      { text: "AI Voice Phone Agent",                       included: false },
      { text: "Website builder",                            included: false },
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
    description: "The complete system — AI phone agent, all channels, website, and full CRM.",
    highlightFeatures: [
      "AI Voice Phone Agent",
      "All 3 channels (phone, Instagram, WhatsApp)",
      "Unlimited messages · 650 voice min/mo",
      "1 website + custom domain",
      "Priority support (24h)",
    ],
    features: [
      { text: "650 voice minutes/month",                     included: true },
      { text: "Unlimited text messages",                     included: true },
      { text: "All 3 channels (phone, Instagram, WhatsApp)", included: true },
      { text: "AI Voice Phone Agent",                        included: true },
      { text: "1 website + custom domain",                   included: true },
      { text: "3 team members",                              included: true },
      { text: "Full CRM + automation",                       included: true },
      { text: "Full funnel analytics",                       included: true },
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
    cta: "Get Premium",
    description: "For businesses that demand zero compromise — priority everything, 3 websites, unlimited team.",
    highlightFeatures: [
      "All 3 channels + priority routing",
      "1,300 voice minutes/month",
      "3 websites + custom domains",
      "Unlimited team members",
      "Done-for-you onboarding",
    ],
    features: [
      { text: "1,300 voice minutes/month",                  included: true },
      { text: "Unlimited text messages",                    included: true },
      { text: "All 3 channels + priority routing",          included: true },
      { text: "AI Voice Phone Agent + priority retraining", included: true },
      { text: "3 websites + custom domains",                included: true },
      { text: "Unlimited team members",                     included: true },
      { text: "Full CRM + custom pipelines",                included: true },
      { text: "Full analytics + exports",                   included: true },
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
