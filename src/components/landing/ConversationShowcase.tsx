"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useScroll, useTransform } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import CursorSpotlight from "@/components/landing/CursorSpotlight";

// Replaces the old three-card WhatsApp/Instagram/Phone ChannelsSection
// (Phase 6 -- read as too plain). This demonstrates a different, more
// distinctive real capability instead: Vela replying in the customer's own
// language. Conversation content is intentionally NOT routed through the
// site's i18n system -- these three languages render simultaneously in
// rotation regardless of the visitor's chosen UI language, since the whole
// point is showing multiple languages at once. Only the section chrome
// (eyebrow/headline/subtext/CTA) follows the site locale via t().
type ConvMsg = { from: "customer" | "ai"; text: string };
type Conversation = { code: string; label: string; dir: "ltr" | "rtl"; messages: ConvMsg[] };

const CONVERSATIONS: Conversation[] = [
  {
    code: "EN",
    label: "English",
    dir: "ltr",
    messages: [
      { from: "customer", text: "Hi! Do you have any appointments open this Thursday?" },
      { from: "ai", text: "Hi there! Yes, we have 10:30 AM and 2:00 PM open this Thursday. Which works better for you?" },
      { from: "customer", text: "2:00 PM works great, thank you!" },
      { from: "ai", text: "Perfect, you're booked for Thursday at 2:00 PM. See you then!" },
    ],
  },
  {
    code: "AR",
    label: "عربي",
    dir: "rtl",
    messages: [
      { from: "customer", text: "مرحباً، هل يوجد موعد متاح يوم الخميس؟" },
      { from: "ai", text: "أهلاً بك! نعم، يوجد موعد الساعة 10:30 صباحاً و 2:00 ظهراً يوم الخميس. أيهما يناسبك؟" },
      { from: "customer", text: "الساعة 2:00 ظهراً ممتاز، شكراً!" },
      { from: "ai", text: "تم الحجز ليوم الخميس الساعة 2:00 ظهراً. نراك حينها!" },
    ],
  },
  {
    code: "HI",
    label: "हिंदी",
    dir: "ltr",
    messages: [
      { from: "customer", text: "नमस्ते, क्या गुरुवार को कोई अपॉइंटमेंट खाली है?" },
      { from: "ai", text: "नमस्ते! जी हां, गुरुवार को सुबह 10:30 बजे और दोपहर 2:00 बजे खाली है। आपके लिए कौन सा समय सही रहेगा?" },
      { from: "customer", text: "दोपहर 2:00 बजे ठीक रहेगा, धन्यवाद!" },
      { from: "ai", text: "बढ़िया, आपकी बुकिंग गुरुवार दोपहर 2:00 बजे के लिए हो गई है। मिलते हैं!" },
    ],
  },
];

const TYPE_MS = 32;
const READ_PAUSE_MS = 550;
const BETWEEN_MSG_MS = 450;
const CONVO_END_PAUSE_MS = 2400;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function AiAvatar() {
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5"
      style={{ background: "var(--vela-gradient)" }}
    >
      V
    </div>
  );
}

function CustomerAvatar() {
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
      style={{ background: "#F3F4F6", color: "#6B7280" }}
    >
      C
    </div>
  );
}

function ChatMockup() {
  const [convoIdx, setConvoIdx] = useState(0);
  const [visible, setVisible] = useState<string[]>([]);
  const [typing, setTyping] = useState("");
  const convo = CONVERSATIONS[convoIdx];

  useEffect(() => {
    let cancelled = false;
    setVisible([]);
    setTyping("");

    async function run() {
      const messages = CONVERSATIONS[convoIdx].messages;
      for (let i = 0; i < messages.length; i++) {
        const full = messages[i].text;
        for (let c = 1; c <= full.length; c++) {
          if (cancelled) return;
          await sleep(TYPE_MS);
          setTyping(full.slice(0, c));
        }
        await sleep(READ_PAUSE_MS);
        if (cancelled) return;
        setVisible((prev) => [...prev, full]);
        setTyping("");
        await sleep(BETWEEN_MSG_MS);
      }
      await sleep(CONVO_END_PAUSE_MS);
      if (!cancelled) setConvoIdx((idx) => (idx + 1) % CONVERSATIONS.length);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [convoIdx]);

  const typingFrom = convo.messages[visible.length]?.from;
  const tailRadius = (from: "customer" | "ai") => {
    const mine = from === "customer";
    if (convo.dir === "rtl") {
      return mine ? { borderBottomLeftRadius: 4 } : { borderBottomRightRadius: 4 };
    }
    return mine ? { borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 };
  };

  return (
    <div className="w-full max-w-[380px] mx-auto rounded-[28px] bg-white border border-[#E5E7EB] overflow-hidden" style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.05)" }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[#F1F5F9]">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: "var(--vela-gradient)" }}>V</div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-[#111111] leading-tight">Vela AI</p>
          <p className="text-[10px] text-[#22C55E] font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> Online
          </p>
        </div>
        <span
          key={convo.code}
          className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
          style={{ background: "#FFF3EE", color: "#C2410C" }}
        >
          {convo.label}
        </span>
      </div>

      {/* Body */}
      <div
        dir={convo.dir}
        className="flex flex-col gap-2 px-4 py-4 min-h-[280px]"
        style={{ background: "#F8FAFC" }}
      >
        {convo.messages.slice(0, visible.length).map((msg, i) => (
          <div key={i} className={`flex items-end gap-2 ${msg.from === "customer" ? "justify-end" : "justify-start"}`}>
            {msg.from === "ai" && <AiAvatar />}
            <div
              className="max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-snug"
              style={{
                ...(msg.from === "customer"
                  ? { background: "var(--vela-gradient)", color: "white" }
                  : { background: "white", color: "#374151", border: "1px solid #E5E7EB" }),
                ...tailRadius(msg.from),
              }}
            >
              {msg.text}
            </div>
            {msg.from === "customer" && <CustomerAvatar />}
          </div>
        ))}

        {typing && typingFrom && (
          <div className={`flex items-end gap-2 ${typingFrom === "customer" ? "justify-end" : "justify-start"}`}>
            {typingFrom === "ai" && <AiAvatar />}
            <div
              className="max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-snug"
              style={{
                ...(typingFrom === "customer"
                  ? { background: "var(--vela-gradient)", color: "white" }
                  : { background: "white", color: "#374151", border: "1px solid #E5E7EB" }),
                ...tailRadius(typingFrom),
              }}
            >
              {typing}
              <span className="inline-block w-[2px] h-[13px] ml-0.5 align-middle bg-current animate-pulse" />
            </div>
            {typingFrom === "customer" && <CustomerAvatar />}
          </div>
        )}
      </div>

      {/* Language pills */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-[#F1F5F9]">
        {CONVERSATIONS.map((c, i) => (
          <button
            key={c.code}
            type="button"
            onClick={() => setConvoIdx(i)}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors duration-200"
            style={
              i === convoIdx
                ? { background: "var(--vela-gradient)", color: "white" }
                : { background: "#F3F4F6", color: "#6B7280" }
            }
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ConversationShowcase() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLDivElement>(null);

  // Mouse-driven tilt -- subtle "3D" depth, no WebGL needed (FIX 4).
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mvY, [-0.5, 0.5], [6, -6]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mvX, [-0.5, 0.5], [-6, 6]), { stiffness: 150, damping: 20 });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mvX.set((e.clientX - rect.left) / rect.width - 0.5);
    mvY.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function onMouseLeave() {
    mvX.set(0);
    mvY.set(0);
  }

  // Scroll-driven parallax -- subtle vertical drift as the section passes.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [36, -36]);

  return (
    <section ref={sectionRef} className="relative py-10 md:py-14 bg-white overflow-hidden">
      <CursorSpotlight size={420} color="rgba(255,107,53,0.10)" />
      <div className="relative max-w-5xl mx-auto px-5 md:px-6" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="text-center mb-10 md:mb-12">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#FF6B35" }}>
            {t("landing.showcase.eyebrow")}
          </span>
          <h2 className="font-display font-extrabold text-[24px] sm:text-[30px] md:text-[36px] text-[#111111] leading-tight">
            {t("landing.showcase.headline1")}{" "}
            <span className="vela-gradient-text">{t("landing.showcase.headlineAccent")}</span>
          </h2>
          <p className="text-[#6B7280] text-base md:text-lg mt-3 max-w-md mx-auto leading-relaxed">
            {t("landing.showcase.subtext")}
          </p>
        </div>

        {/* Mockup with mouse tilt + scroll parallax */}
        <div onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} style={{ perspective: 1200 }}>
          <motion.div style={{ rotateX, rotateY, y: parallaxY, transformStyle: "preserve-3d" }}>
            <ChatMockup />
          </motion.div>
        </div>

        <div className="text-center mt-9">
          <Link href="/auth/signup" className="btn-primary whitespace-nowrap text-sm py-3 px-7 sm:text-base sm:py-3.5 sm:px-8">
            {t("landing.showcase.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
