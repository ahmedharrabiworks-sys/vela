"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";

type StepStatus = "done" | "pending";

interface Step {
  id: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  status: StepStatus;
  icon: React.ReactNode;
  color: string;
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="rgba(22,163,74,0.12)"/>
      <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#16A34A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const [name, setName]           = useState("");
  const [steps, setSteps]         = useState<Step[]>([]);
  const [loading, setLoading]     = useState(true);
  const [allDone, setAllDone]     = useState(false);

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = getSupabase() as any;
      const { data: { user } } = await db.auth.getUser();
      const fullName = (user?.user_metadata?.full_name as string | undefined) || "";
      setName(fullName.split(" ")[0] || "there");

      let channelDone = false;
      let aiDone = false;

      if (user) {
        const { data: tenant } = await db
          .from("tenants")
          .select("id")
          .eq("owner_id", user.id)
          .single();

        if (tenant) {
          const { data: cfg } = await db
            .from("tenant_config")
            .select("instagram_connected, whatsapp_connected, services_json")
            .eq("tenant_id", tenant.id)
            .maybeSingle();

          channelDone = !!(cfg?.instagram_connected || cfg?.whatsapp_connected);
          const services = cfg?.services_json as unknown[] | null;
          aiDone = Array.isArray(services) && services.length > 0;
        }
      }

      const ob = JSON.parse(localStorage.getItem("vela_onboarding") || "{}") as Record<string, boolean>;
      const websiteDone = !!ob.websiteDone;

      if (aiDone) {
        const next = { ...ob, aiDone: true };
        localStorage.setItem("vela_onboarding", JSON.stringify(next));
      }
      if (channelDone) {
        const next = { ...ob, channelDone: true };
        localStorage.setItem("vela_onboarding", JSON.stringify(next));
      }

      const done = channelDone && aiDone && websiteDone;
      setAllDone(done);

      setSteps([
        {
          id: "channel",
          title: "Connect a channel",
          description: "Connect WhatsApp, Instagram, or your website chat so customers can reach your AI assistant.",
          cta: channelDone ? "Connected" : "Connect now",
          href: "/app/channels",
          status: channelDone ? "done" : "pending",
          color: "#FF6B35",
          icon: (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 2a9 9 0 0 1 7.79 13.5L20 20l-4.62-1.22A9 9 0 1 1 11 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M8 9c.3 1.2 1.8 3.6 3 4.8 1.2 1.2 3.15 2.55 4.35 2.7.75.15 1.2-.15 1.5-.6l.45-.75c.15-.3 0-.6-.15-.75l-1.5-.75c-.3-.15-.6 0-.75.15l-.45.6c-.75-.3-2.1-1.35-2.85-2.85l.45-.45c.15-.15.3-.45.15-.75l-.75-1.5c-.15-.3-.45-.3-.75-.15l-.75.45C8.15 7.8 7.85 8.25 8 9z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          ),
        },
        {
          id: "ai",
          title: "Review your AI setup",
          description: "Add your services, prices, FAQ, and set the tone so your AI knows exactly how to represent your business.",
          cta: aiDone ? "Configured" : "Configure AI",
          href: "/app/settings",
          status: aiDone ? "done" : "pending",
          color: "#7C3AED",
          icon: (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="3" y="3" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 11h8M7 7.5h5M7 14.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ),
        },
        {
          id: "website",
          title: "Build your website",
          description: "Launch a beautiful, AI-powered website for your business — no code needed, live in minutes.",
          cta: websiteDone ? "Built" : "Build website",
          href: "/app/website",
          status: websiteDone ? "done" : "pending",
          color: "#16A34A",
          icon: (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2.5 11h17M11 2.5c-2 2.5-2 12 0 17M11 2.5c2 2.5 2 12 0 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ),
        },
      ]);

      setLoading(false);
    })();
  }, []);

  const doneCount = steps.filter((s) => s.status === "done").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-[#FF6B35] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (allDone) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center px-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M5 14l6 6 12-12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#111111] mb-2">You&apos;re all set, {name}!</h1>
        <p className="text-sm text-[#6B7280] mb-8">Your AI assistant is live and ready to handle customers 24/7.</p>
        <Link href="/app"
          className="inline-block px-8 py-3.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
          Go to Dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 pb-20">

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111111] mb-2">
          Welcome to Vela, {name}!
        </h1>
        <p className="text-sm text-[#6B7280]">Get live in 3 steps — takes less than 5 minutes.</p>

        {/* Progress bar */}
        <div className="mt-5 max-w-xs mx-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[#6B7280] font-medium">{doneCount} of 3 complete</span>
            <span className="text-[11px] font-bold text-[#FF6B35]">{Math.round((doneCount / 3) * 100)}%</span>
          </div>
          <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(doneCount / 3) * 100}%`, background: "linear-gradient(90deg,#FF6B35,#FF3366)" }}
            />
          </div>
        </div>
      </div>

      {/* Step cards */}
      <div className="space-y-4">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className={`relative flex items-start gap-5 p-5 md:p-6 rounded-2xl border transition-all ${
              step.status === "done"
                ? "bg-white border-[#E5E7EB] opacity-75"
                : "bg-white border-[#E5E7EB] hover:border-[#FF6B35]/30 hover:shadow-sm"
            }`}
          >
            {/* Step number */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
              style={{
                background: step.status === "done"
                  ? "#F3F4F6"
                  : `linear-gradient(135deg, ${step.color}22, ${step.color}11)`,
                color: step.status === "done" ? "#9CA3AF" : step.color,
                border: `1.5px solid ${step.status === "done" ? "#E5E7EB" : step.color + "33"}`,
              }}
            >
              {step.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Step {i + 1}</span>
                {step.status === "done" && <CheckIcon />}
              </div>
              <h3 className="text-sm font-bold text-[#111111] mb-1">{step.title}</h3>
              <p className="text-xs text-[#6B7280] leading-relaxed mb-4">{step.description}</p>
              {step.status === "done" ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600">
                  <CheckIcon /> Done
                </span>
              ) : (
                <Link
                  href={step.href}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
                  style={{ background: step.color }}
                >
                  {step.cta} →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Skip link */}
      <div className="text-center mt-8">
        <Link href="/app" className="text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
          Skip for now → go to dashboard
        </Link>
      </div>
    </div>
  );
}
