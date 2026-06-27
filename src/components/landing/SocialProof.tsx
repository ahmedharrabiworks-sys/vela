"use client";

const CLIENTS = [
  "Dental Clinic Dubai",
  "Cosmetic Center Riyadh",
  "Interior Studio KW",
  "Fitness Hub Jeddah",
  "Real Estate LLC",
  "Auto Gallery UAE",
  "Law Partners Group",
  "Derma Clinic Doha",
  "The Gym Collective",
  "Elite Properties",
  "Smile Dental Care",
  "Aesthetica Clinic",
];

function ClientItem({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 px-6 shrink-0">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FF3366] opacity-30" />
      <span className="text-sm font-medium text-[#1A0A00]/60 whitespace-nowrap">{name}</span>
    </div>
  );
}

export default function SocialProof() {
  const doubled = [...CLIENTS, ...CLIENTS];

  return (
    <section className="py-14 bg-white border-y border-[#f0e8e0]">
      <div className="max-w-7xl mx-auto px-6 mb-8 text-center">
        <p className="text-sm font-semibold text-[#888888] uppercase tracking-widest">
          Trusted by 200+ businesses across the Gulf
        </p>
      </div>

      {/* Marquee track */}
      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-white to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />

        <div className="flex animate-marquee">
          {doubled.map((name, i) => (
            <ClientItem key={`${name}-${i}`} name={name} />
          ))}
        </div>
      </div>
    </section>
  );
}
