import Image from "next/image";
import Link from "next/link";

export default function ComparisonSection() {
  return (
    <section className="py-10 md:py-14 bg-white">
      <div className="max-w-7xl mx-auto px-5 md:px-6">

        {/* Section header */}
        <div className="text-center mb-10 md:mb-14">
          <h2
            className="vela-heading text-[22px] sm:text-[28px] md:text-[34px] text-[#111111] leading-tight"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            One platform.{" "}
            <span className="vela-gradient-text">Everything included.</span>
          </h2>
          <p className="text-[#6B7280] text-base md:text-lg mt-4 max-w-lg mx-auto leading-relaxed">
            Replace the tools you&apos;re already paying for. Vela handles it all at a fraction of the cost.
          </p>
        </div>

        {/* Comparison table image with CTA button in the image's blank space */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-3xl">
            <Image
              src="/assets/comparison-bg.png"
              alt="Vela vs other tools: full feature comparison table"
              width={1023}
              height={1537}
              className="w-full h-auto rounded-2xl"
              unoptimized
            />
            {/* CTA positioned in the blank area baked into the bottom of the image */}
            <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2">
              <Link href="/auth/signup" className="btn-primary whitespace-nowrap">
                Start your 7 day free trial
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
