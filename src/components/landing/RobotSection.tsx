import Image from "next/image";

export default function RobotSection() {
  return (
    <section style={{ background: "#0A0A0A" }}>
      <div className="max-w-6xl mx-auto">
        <Image
          src="/assets/robot-section.png"
          alt="Everything your business needs. One AI system."
          width={1672}
          height={941}
          className="w-full h-auto block"
          unoptimized
          priority={false}
        />
      </div>
    </section>
  );
}
