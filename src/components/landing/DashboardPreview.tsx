"use client";

import dynamic from "next/dynamic";

const DashboardScene = dynamic(() => import("@/components/three/DashboardScene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-16 h-16 rounded-full border-2 border-[#FF6B35]/30 border-t-[#FF6B35] animate-spin" />
    </div>
  ),
});

export default function DashboardPreview() {
  return (
    <section className="py-28 bg-[#1A0A00] relative overflow-hidden">
      {/* Top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse,rgba(255,107,53,0.2),transparent)] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="section-label mb-6">Live Dashboard</span>
          <h2 className="vela-heading text-4xl md:text-5xl text-white mt-6">
            See your business{" "}
            <span className="vela-gradient-text">from above.</span>
          </h2>
          <p className="mt-5 text-white/55 text-lg max-w-xl mx-auto">
            Every lead, every conversation, every booking — in one unified view.
            Move your cursor to explore.
          </p>
        </div>

        {/* 3D Canvas */}
        <div className="relative mx-auto max-w-5xl">
          {/* Glow orb behind */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(255,107,53,0.18),transparent)] animate-pulse-glow" />

          <div className="h-[480px] md:h-[560px]">
            <DashboardScene />
          </div>

          {/* Corner labels */}
          <div className="absolute top-6 left-6 hidden lg:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
            <span className="text-xs text-white/50 font-medium">Live · 3 active conversations</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-14">
          {[
            { value: "< 60s", label: "Average reply time" },
            { value: "94%", label: "Lead capture rate" },
            { value: "24/7", label: "Always-on AI" },
            { value: "3×", label: "More bookings vs manual" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-extrabold vela-gradient-text mb-1">{stat.value}</p>
              <p className="text-sm text-white/50">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
