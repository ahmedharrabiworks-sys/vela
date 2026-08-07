import Image from "next/image";
import Link from "next/link";

export default function DashboardSection() {
  return (
    <section className="py-10 md:py-14 bg-white relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex: 0 }}>
        <div style={{ position: "absolute", width: 600, height: 600, top: -80, left: "60%", transform: "translateX(-50%)", borderRadius: "50%", background: "rgba(255,107,53,0.06)", filter: "blur(90px)" }} />
        <div style={{ position: "absolute", width: 400, height: 400, bottom: -60, left: "5%", borderRadius: "50%", background: "rgba(255,51,102,0.04)", filter: "blur(80px)" }} />
      </div>
      <div className="max-w-6xl mx-auto px-5 md:px-6" style={{ position: "relative", zIndex: 1 }}>
        <div className="relative overflow-hidden rounded-2xl">
          <Image
            src="/assets/dashboard-mockup.png"
            alt="Vela dashboard showing AI managing your business channels"
            width={1408}
            height={768}
            className="w-full h-auto rounded-2xl"
            unoptimized
            priority={false}
          />
          {/* CTA positioned in the blank space baked into the bottom of the image */}
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
