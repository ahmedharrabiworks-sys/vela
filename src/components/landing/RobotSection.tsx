import Image from "next/image";

export default function RobotSection() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-5 md:px-6">
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
      </div>
    </section>
  );
}
