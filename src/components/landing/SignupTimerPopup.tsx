"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "vela_signup_popup_dismissed";
const DELAY_MS = 5500;

export default function SignupTimerPopup() {
  const [visible, setVisible] = useState(false);

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

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 right-5 sm:right-6 z-[90] w-[300px] sm:w-[340px] rounded-2xl p-5"
          style={{
            background: "#fff",
            border: "1.5px solid #E5E7EB",
            boxShadow: "0 20px 60px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06)",
          }}
        >
          {/* Dismiss */}
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151] transition-colors"
            aria-label="Dismiss"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--vp-10)", border: "1px solid var(--vp-20)" }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ color: "var(--vp-color)" }}>
                <path d="M9 2L11 7H16L12 10.5L13.5 16L9 12.5L4.5 16L6 10.5L2 7H7L9 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#111111] leading-tight">Ready to automate your business?</p>
              <p className="text-[11px] text-[#6B7280] mt-0.5">Be live in 7 days — no setup required.</p>
            </div>
          </div>

          <Link
            href="/auth/signup"
            onClick={dismiss}
            className="btn-primary w-full text-sm py-2.5 justify-center"
            style={{ display: "flex" }}
          >
            Get Started — Cancel anytime
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
