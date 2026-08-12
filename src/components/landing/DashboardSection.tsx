import Image from "next/image";
import Link from "next/link";

export default function DashboardSection() {
  return (
    <section className="py-10 md:py-14 bg-white">
      <div className="max-w-6xl mx-auto px-5 md:px-6">
        {/* Glow hugging the dashboard mockup image */}
        <div className="relative">
          <div className="absolute top-1/2 left-1/2 pointer-events-none" aria-hidden="true"
            style={{ width: "calc(100% + 80px)", height: "calc(100% + 80px)", transform: "translate(-50%,-50%)", borderRadius: "50%", background: "rgba(255,107,53,0.2)", filter: "blur(60px)", zIndex: 0 }} />
          <div className="relative overflow-hidden rounded-2xl" style={{ zIndex: 1 }}>
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
              <Link href="/auth/signup" className="btn-primary whitespace-nowrap text-xs py-2 px-4 sm:text-sm sm:py-3.5 sm:px-7">
                Start 7-Day Free Trial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
