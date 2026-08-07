import Image from "next/image";
import TrialCTAButton from "@/components/landing/TrialCTAButton";

export default function RobotSection() {
  return (
    <section className="py-10 md:py-14 bg-white relative">
      {/* Gradient fade bridging to the footer's cream background */}
      <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" aria-hidden="true"
        style={{ background: "linear-gradient(to bottom, transparent 0%, var(--vt-color) 100%)", zIndex: 2 }} />
      <div className="max-w-6xl mx-auto px-5 md:px-6" style={{ position: "relative", zIndex: 1 }}>
        {/* Glow hugging the robot section image */}
        <div className="relative">
          <div className="absolute top-1/2 left-1/2 pointer-events-none" aria-hidden="true"
            style={{ width: "calc(100% + 80px)", height: "calc(100% + 80px)", transform: "translate(-50%,-50%)", borderRadius: "50%", background: "rgba(255,51,102,0.16)", filter: "blur(60px)", zIndex: 0 }} />
          <div className="relative overflow-hidden rounded-2xl" style={{ zIndex: 1 }}>
            <Image
              src="/assets/robot-section.png"
              alt="Everything your business needs. One AI system."
              width={1672}
              height={941}
              className="w-full h-auto rounded-2xl"
              style={{ boxShadow: "0 8px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)" }}
              unoptimized
              priority={false}
            />
            {/* CTA in bottom-left open space, below the 3-column feature row */}
            <div className="absolute bottom-[8%] left-[5%]">
              <TrialCTAButton className="btn-primary whitespace-nowrap">
                Start 7-Day Free Trial
              </TrialCTAButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
