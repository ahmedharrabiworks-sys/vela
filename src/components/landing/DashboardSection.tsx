import Image from "next/image";
import Link from "next/link";

export default function DashboardSection() {
  return (
    <section className="py-10 md:py-14 bg-white">
      <div className="max-w-6xl mx-auto px-5 md:px-6">
        <div className="relative">
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
              Start your 7 day free trial
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
