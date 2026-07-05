export interface PlanFeature { text: string; included: boolean }

export interface Plan {
  id: "starter" | "pro" | "premium";
  name: string;
  monthly: number;
  annual: number;
  popular: boolean;
  cta: string;
  description: string;
  features: PlanFeature[];
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthly: 79,
    annual: 63,
    popular: false,
    cta: "Get Started",
    description: "Everything you need to get started with AI automation.",
    features: [
      { text: "1 custom domain",          included: true  },
      { text: "AI on 1 channel only",     included: true  },
      { text: "Basic website template",   included: true  },
      { text: "50 bookings/month",        included: true  },
      { text: "Generic AI responses",     included: true  },
      { text: "Basic calendar",           included: true  },
      { text: "No follow-up automation",  included: false },
      { text: "Basic CRM",                included: true  },
      { text: "No white label",           included: false },
      { text: "1 team member",            included: true  },
      { text: "No analytics",             included: false },
      { text: "Email support only",       included: true  },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 159,
    annual: 127,
    popular: true,
    cta: "Get Started",
    description: "The complete system for serious businesses ready to scale.",
    features: [
      { text: "2 custom domains",                                included: true },
      { text: "All 3 channels (WhatsApp + Instagram + Website)", included: true },
      { text: "Beautiful custom website",                        included: true },
      { text: "Unlimited bookings",                              included: true },
      { text: "AI trained on YOUR business",                     included: true },
      { text: "Full calendar + auto reminders",                  included: true },
      { text: "Auto follow-up sequences",                        included: true },
      { text: "Full CRM pipeline view",                          included: true },
      { text: "White label included",                            included: true },
      { text: "15 team members",                                 included: true },
      { text: "Full analytics dashboard",                        included: true },
      { text: "Live chat support 24/7",                          included: true },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    monthly: 299,
    annual: 239,
    popular: false,
    cta: "Get Premium",
    description: "For businesses that demand the absolute best, no compromises.",
    features: [
      { text: "3 custom domains",                        included: true },
      { text: "All 3 channels + priority responses",     included: true },
      { text: "Full custom website + animations",        included: true },
      { text: "Unlimited bookings",                      included: true },
      { text: "Advanced AI — learns over time",          included: true },
      { text: "Full calendar + reminders + analytics",   included: true },
      { text: "Advanced follow-up sequences",            included: true },
      { text: "Full CRM + revenue reports",              included: true },
      { text: "White label included",                    included: true },
      { text: "Unlimited team members",                  included: true },
      { text: "Advanced analytics + exports",            included: true },
      { text: "Dedicated account manager",               included: true },
    ],
  },
];
