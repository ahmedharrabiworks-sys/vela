import Image from "next/image";
import Link from "next/link";

export default function RobotSection() {
  return (
    <section className="py-10 md:py-14 bg-white relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex: 0 }}>
        <div style={{ position: "absolute", width: 700, height: 700, top: "30%", right: "-10%", borderRadius: "50%", background: "rgba(255,107,53,0.065)", filter: "blur(100px)" }} />
        <div style={{ position: "absolute", width: 500, height: 500, bottom: -80, left: "15%", borderRadius: "50%", background: "rgba(255,51,102,0.045)", filter: "blur(90px)" }} />
      </div>
      {/* Gradient fade bridging to the footer's cream background */}
      <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" aria-hidden="true"
        style={{ background: "linear-gradient(to bottom, transparent 0%, var(--vt-color) 100%)", zIndex: 2 }} />
      <div className="max-w-6xl mx-auto px-5 md:px-6" style={{ position: "relative", zIndex: 1 }}>
        <div className="relative overflow-hidden rounded-2xl">
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
            <Link href="/auth/signup" className="btn-primary whitespace-nowrap">
              Start 7-Day Free Trial
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
