import Image from "next/image";

export default function DashboardSection() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-5 md:px-6 flex justify-center">
        <Image
          src="/assets/dashboard-mockup.png"
          alt="Vela dashboard — AI employee managing your business channels"
          width={1408}
          height={768}
          className="w-full h-auto rounded-2xl"
          style={{ boxShadow: "0 8px 48px rgba(0,0,0,0.10)" }}
          unoptimized
          priority={false}
        />
      </div>
    </section>
  );
}
