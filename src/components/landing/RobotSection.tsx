import Link from "next/link";

// Real markup, not an image -- see git history for the old robot-section.png
// version. Same layout/colors/copy as the original image; only the format
// changed so the headline/subtext/feature list are real, selectable text.
// The robot photo itself stays a real image (a photo can't become "text"),
// cropped via CSS to show only the robot -- the flattened original baked
// the headline into the same image on a plain black field to its left,
// which is recreated here as a real solid-black panel behind the new HTML
// text instead.
const FEATURES = [
  { title: "ALL CHANNELS", desc: "Every call, message, and DM, one unified inbox." },
  { title: "ALL-IN-ONE", desc: "No more juggling 10 different tools. Vela replaces them all." },
  { title: "ALWAYS ON", desc: "Set it up once. Vela runs your front desk day and night." },
];

export default function RobotSection() {
  return (
    <section className="py-10 md:py-14 bg-white relative">
      {/* Gradient fade bridging to the footer's cream background */}
      <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" aria-hidden="true"
        style={{ background: "linear-gradient(to bottom, transparent 0%, var(--vt-color) 100%)", zIndex: 2 }} />
      <div className="max-w-6xl mx-auto px-5 md:px-6" style={{ position: "relative", zIndex: 1 }}>
        {/* Glow hugging the panel */}
        <div className="relative">
          <div className="absolute top-1/2 left-1/2 pointer-events-none" aria-hidden="true"
            style={{ width: "calc(100% + 80px)", height: "calc(100% + 80px)", transform: "translate(-50%,-50%)", borderRadius: "50%", background: "rgba(255,51,102,0.16)", filter: "blur(60px)", zIndex: 0 }} />

          <div
            className="relative overflow-hidden rounded-2xl grid grid-cols-1 lg:grid-cols-2"
            style={{ background: "#0A0300", boxShadow: "0 8px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)", zIndex: 1 }}
          >
            {/* Text panel */}
            <div className="px-6 py-10 sm:px-10 sm:py-12 lg:py-14 flex flex-col justify-center order-2 lg:order-1">
              <h2 className="font-inter font-extrabold text-[26px] sm:text-[32px] lg:text-[36px] text-white leading-tight">
                Everything your business needs. One AI system.
              </h2>
              <p className="text-white/70 text-base sm:text-lg mt-4 leading-relaxed max-w-md">
                Phone, WhatsApp, Instagram, website, bookings, and follow-ups, all handled by one AI, working 24/7.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 mt-8 lg:mt-10">
                {FEATURES.map((f, i) => (
                  <div
                    key={f.title}
                    className={i > 0 ? "sm:border-l sm:border-white/15 sm:pl-4" : ""}
                  >
                    <p className="text-white text-xs font-bold tracking-wider">{f.title}</p>
                    <p className="text-white/60 text-sm mt-1.5 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 lg:mt-10">
                <Link href="/auth/signup" className="btn-primary whitespace-nowrap text-sm py-3 px-7 sm:text-base sm:py-3.5 sm:px-8 inline-flex">
                  Get Started
                </Link>
              </div>
            </div>

            {/* Robot photo panel. Stopgap crop fix (Phase 5, FIX 6): the
                previous background-image version let this panel's height
                follow the grid row (i.e. the text column's height), so the
                effective crop shifted with however much text happened to
                wrap at a given width, sometimes cutting the robot off
                mid-body. A real <img> with a fixed aspect-ratio and
                object-fit/object-position makes the crop point stable and
                predictable regardless of the text column's height.
                object-position favors the head/shoulders (upper-right of
                the source image) since that's the recognizable part of the
                mascot. This is a partial fix pending a proper source asset
                cropped to just the robot, not a redraw or new image. */}
            <div className="order-1 lg:order-2 relative overflow-hidden" style={{ aspectRatio: "4 / 3" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/robot-section.png"
                alt="Vela AI robot mascot"
                className="absolute inset-0 w-full h-full"
                style={{ objectFit: "cover", objectPosition: "78% 22%" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
