"use client";

import { useEffect } from "react";

// FIX 5 (round P): audit found zero shared toast component -- delete/
// soft-delete actions across Leads, Conversations, Appointments, Website
// Builder, and Settings -> Recycle Bin showed NO feedback at all beyond the
// row silently disappearing, and the two places that DID have a toast
// (Settings page saves, Channels page connect/disconnect) each defined
// their own local, near-duplicate copy. This is the single shared version
// (the more complete of the two duplicates -- success/error/info variants,
// safe-area-aware bottom positioning for mobile) every page should import.
export type ToastType = "success" | "error" | "info";

export default function Toast({
  msg,
  type = "success",
  onDone,
  duration = 3200,
}: {
  msg: string;
  type?: ToastType;
  onDone: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [onDone, duration]);

  const iconColor = type === "error" ? "#DC2626" : type === "info" ? "#6B7280" : "#FF6B35";

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-[#1A0A00] text-white text-sm font-medium shadow-2xl max-w-sm text-center"
      style={{ bottom: "max(24px, calc(env(safe-area-inset-bottom) + 16px))" }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
        {type === "error"
          ? <path d="M2 2l10 10M12 2L2 12" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" />
          : <path d="M2 7l3 3 7-7" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {msg}
    </div>
  );
}
