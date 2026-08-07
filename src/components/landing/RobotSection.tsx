import Image from "next/image";
import Link from "next/link";

export default function RobotSection() {
  return (
    <section className="py-10 md:py-14 bg-white">
      <div className="max-w-6xl mx-auto px-5 md:px-6">
        <div className="relative">
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
              Start your 7 day free trial
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
