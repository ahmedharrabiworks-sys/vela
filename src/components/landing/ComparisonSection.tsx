import Image from "next/image";

export default function ComparisonSection() {
  return (
    <section className="py-20 md:py-28 bg-white border-t border-[#F0E8E0]">
      <div className="max-w-7xl mx-auto px-5 md:px-6">

        {/* Section header */}
        <div className="text-center mb-10 md:mb-14">
          <span className="section-label inline-flex mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" aria-hidden="true" />
            Why Vela
          </span>
          <h2
            className="vela-heading text-[28px] sm:text-[36px] md:text-[44px] text-[#111111] leading-tight mt-4"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            One platform.{" "}
            <span className="vela-gradient-text">Everything included.</span>
          </h2>
          <p className="text-[#6B7280] text-base md:text-lg mt-4 max-w-lg mx-auto leading-relaxed">
            Replace the tools you&apos;re already paying for — Vela handles it all at a fraction of the cost.
          </p>
        </div>

        {/* Comparison table image — 1024×1536 source, capped at max-w-3xl for readability */}
        <div className="flex justify-center">
          <Image
            src="/assets/comparison-bg.png"
            alt="Vela vs other tools — full feature comparison table"
            width={1024}
            height={1536}
            className="w-full max-w-3xl h-auto rounded-2xl"
            style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.08)" }}
            unoptimized
          />
        </div>

      </div>
    </section>
  );
}
