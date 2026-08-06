import Image from "next/image";

export default function DashboardSection() {
  return (
    <section className="pb-20 md:pb-28 pt-0 bg-white">
      <div className="max-w-6xl mx-auto px-5 md:px-6 flex justify-center">
        <Image
          src="/assets/dashboard-mockup.png"
          alt="Vela dashboard — AI employee managing your business channels"
          width={1408}
          height={768}
          className="w-full h-auto rounded-2xl"
          unoptimized
          priority={false}
        />
      </div>
    </section>
  );
}
