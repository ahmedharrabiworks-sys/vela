import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const planId = session.metadata?.planId;
      const email = session.customer_email;

      if (email && planId) {
        const { data } = await supabase.auth.admin.listUsers();
        const user = data?.users?.find((u) => u.email === email);
        if (user) {
          await supabase.from("tenants").upsert({
            owner_id: user.id,
            business_name: "My Business",
            plan: planId as "starter" | "pro" | "premium",
          });
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      // Handle cancellation
      break;
    }
  }

  return NextResponse.json({ received: true });
}
