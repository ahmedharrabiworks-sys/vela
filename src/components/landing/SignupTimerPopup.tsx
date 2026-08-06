"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "vela_signup_popup_v2";
const DELAY_MS = 5500;

export default function SignupTimerPopup() {
  const [visible, setVisible] = useState(false);
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dismiss();
    const p = new URLSearchParams();
    if (name)  p.set("name", name);
    if (email) p.set("email", email);
    if (phone) p.set("phone", phone);
    router.push(`/auth/signup?${p.toString()}`);
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100]"
            style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(6px)" }}
            onClick={dismiss}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-[460px] rounded-3xl overflow-hidden"
              style={{ boxShadow: "0 40px 100px rgba(0,0,0,0.30), 0 8px 24px rgba(0,0,0,0.12)" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Dark header band */}
              <div
                className="relative px-8 pt-8 pb-6 text-center"
                style={{ background: "linear-gradient(145deg, #130800 0%, #2C1005 55%, #ff6b3520 100%)" }}
              >
                <button
                  onClick={dismiss}
                  aria-label="Close"
                  className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>

                <div className="flex justify-center mb-4">
                  <Image src="/assets/mascot.png" alt="Vela" width={72} height={72} className="object-contain drop-shadow-xl" unoptimized />
                </div>
                <h2 className="text-[22px] font-bold text-white leading-tight mb-1.5">
                  Be live in 7 days
                </h2>
                <p className="text-white/55 text-sm leading-relaxed">
                  AI that answers your customers 24/7 —<br className="hidden sm:block" />
                  on every channel, in every language.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="bg-white px-8 py-7 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ahmed Al-Rashid"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#111111] placeholder-[#9CA3AF] transition-colors focus:outline-none"
                      style={{ boxShadow: "none" }}
                      onFocus={e => (e.target.style.borderColor = "var(--vp-color)")}
                      onBlur={e => (e.target.style.borderColor = "#E5E7EB")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#111111] placeholder-[#9CA3AF] transition-colors focus:outline-none"
                      style={{ boxShadow: "none" }}
                      onFocus={e => (e.target.style.borderColor = "var(--vp-color)")}
                      onBlur={e => (e.target.style.borderColor = "#E5E7EB")}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@yourbusiness.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#111111] placeholder-[#9CA3AF] transition-colors focus:outline-none"
                    style={{ boxShadow: "none" }}
                    onFocus={e => (e.target.style.borderColor = "var(--vp-color)")}
                    onBlur={e => (e.target.style.borderColor = "#E5E7EB")}
                  />
                </div>

                <button type="submit" className="btn-primary w-full py-3.5 text-base justify-center mt-1">
                  Get Started — Cancel anytime
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M3 7.5h9M8.5 4l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                <p className="text-center text-xs text-[#9CA3AF]">
                  No credit card required to get started.
                </p>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
