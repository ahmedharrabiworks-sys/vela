import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder_build_only");

export const PLANS = {
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_PRICE_STARTER!,
    monthlyAmount: 10000, // $100 in cents
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRICE_PRO!,
    monthlyAmount: 15900, // $159 in cents
  },
  premium: {
    name: "Premium",
    priceId: process.env.STRIPE_PRICE_PREMIUM!,
    monthlyAmount: 19900, // $199 in cents
  },
} as const;

export type PlanId = keyof typeof PLANS;
