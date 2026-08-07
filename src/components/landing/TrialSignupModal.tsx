"use client";

import { useState, useEffect } from "react";
import { useTrialModal } from "@/lib/useTrialModalState";

const inputCls =
  "w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all";

export default function TrialSignupModal() {
  const { isOpen, close } = useTrialModal();

  const [step, setStep]       = useState(1);
  const [done, setDone]       = useState(false);

  // Step 1 fields
  const [company, setCompany] = useState("");
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");

  // Step 2 fields (UI only — no payment API)
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry]   = useState("");
  const [cvc, setCvc]         = useState("");

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => { setStep(1); setDone(false); }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setStep(2);
  }

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    // BILLING PLACEHOLDER — this button does NOT call any payment API.
    // Replace this handler with real Stripe / Paddle integration when billing is wired.
    setDone(true);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
        onClick={close}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-[480px] bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.08)", maxHeight: "90vh", overflowY: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#F3F4F6]">
            {/* Step indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={step >= 1 || done
                    ? { background: "var(--vela-gradient)", color: "#fff" }
                    : { background: "#F3F4F6", color: "#9CA3AF" }}
                >
                  {(step > 1 || done) ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : "1"}
                </span>
                <span className={`text-xs font-semibold ${step === 1 && !done ? "text-[#111111]" : "text-[#9CA3AF]"}`}>
                  Your business
                </span>
              </div>

              <div className="w-8 h-px" style={{ background: step === 2 || done ? "var(--vp-color)" : "#E5E7EB" }} />

              <div className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={step === 2 || done
                    ? { background: "var(--vela-gradient)", color: "#fff" }
                    : { background: "#F3F4F6", color: "#9CA3AF" }}
                >
                  2
                </span>
                <span className={`text-xs font-semibold ${step === 2 && !done ? "text-[#111111]" : "text-[#9CA3AF]"}`}>
                  Payment
                </span>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={close}
              aria-label="Close"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="px-6 pb-6 pt-5">

            {/* ── Confirmation state ── */}
            {done && (
              <div className="py-6 text-center">
                <div className="w-14 h-14 rounded-full bg-[#FFF5F0] flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M5 14l7 7 11-11" stroke="#FF6B35" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-[#111111] mb-2">You&apos;re in!</h2>
                <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
                  Your 7-day trial starts now. We&apos;ll be in touch with next steps.
                </p>
                <button
                  onClick={close}
                  className="py-2.5 px-8 rounded-xl font-semibold text-sm text-white transition-all"
                  style={{ background: "var(--vela-gradient)" }}
                >
                  Go to app
                </button>
              </div>
            )}

            {/* ── Step 1: Business info ── */}
            {!done && step === 1 && (
              <>
                <h2 className="text-lg font-bold text-[#111111] mb-0.5">Tell us about your business</h2>
                <p className="text-sm text-[#6B7280] mb-5">Just the basics to set up your account.</p>

                <form onSubmit={handleStep1} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">Company Name</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme Dental Clinic"
                      required
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ahmed Al-Rashid"
                        required
                        className={inputCls}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 555 000 0000"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">Work Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@yourbusiness.com"
                      required
                      className={inputCls}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 mt-1 transition-all hover:opacity-90"
                    style={{ background: "var(--vela-gradient)" }}
                  >
                    Continue
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7h8M7.5 4l3.5 3-3.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  <p className="text-center text-xs text-[#9CA3AF]">Cancel anytime · No commitment</p>
                </form>
              </>
            )}

            {/* ── Step 2: Payment (UI only) ── */}
            {!done && step === 2 && (
              <>
                <h2 className="text-lg font-bold text-[#111111] mb-0.5">Payment details</h2>
                <p className="text-sm text-[#6B7280] mb-1">Your trial starts now.</p>
                <p className="text-xs text-[#9CA3AF] mb-5">You won&apos;t be charged until day 8. Cancel anytime before then and pay nothing.</p>

                {/* BILLING PLACEHOLDER — fields are UI only, not wired to any payment processor.
                    Replace these inputs with a real Stripe Elements / Paddle integration. */}
                <form onSubmit={handleStep2} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">Card Number</label>
                    <input
                      type="text"
                      value={cardNum}
                      onChange={(e) => setCardNum(e.target.value.replace(/\D/g, "").slice(0, 16))}
                      placeholder="1234 5678 9012 3456"
                      required
                      maxLength={16}
                      inputMode="numeric"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">Expiry</label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        placeholder="MM / YY"
                        required
                        maxLength={7}
                        className={inputCls}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">CVC</label>
                      <input
                        type="text"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="123"
                        required
                        maxLength={4}
                        inputMode="numeric"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl font-semibold text-white text-sm mt-1 transition-all hover:opacity-90"
                    style={{ background: "var(--vela-gradient)" }}
                  >
                    Start Your 7-Day Trial
                  </button>
                </form>

                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#374151] transition-colors"
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M8 10L4 6.5 8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Back
                  </button>
                  <p className="text-xs text-[#9CA3AF]">Cancel anytime</p>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
