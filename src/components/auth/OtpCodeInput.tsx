"use client";

import { useRef, useState, useEffect } from "react";

const LEN = 6;

/**
 * Shared 6-digit code entry, used by both signup's "check your email" code
 * screen and forgot-password's recovery-code screen (FIX 3) -- one
 * implementation so paste/auto-advance/auto-submit behavior can't drift
 * between the two. Purely controlled from the outside: the parent owns the
 * value and submit trigger, this only handles the per-box input mechanics.
 */
export default function OtpCodeInput({
  value,
  onChange,
  onComplete,
  disabled,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Fires once when the 6th digit is entered/pasted -- the parent decides whether to auto-submit. */
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [firedFor, setFiredFor] = useState("");
  const digits = Array.from({ length: LEN }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (value.length === LEN && value !== firedFor) {
      setFiredFor(value);
      onComplete(value);
    }
    if (value.length < LEN) setFiredFor("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const setDigitAt = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join("").slice(0, LEN));
  };

  const handleChange = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, "");
    if (!d) {
      setDigitAt(i, "");
      return;
    }
    // Typing (or an autofill drop) into one box with multiple chars -- treat
    // as a paste-from-here of the remaining digits.
    if (d.length > 1) {
      const rest = d.slice(0, LEN - i).split("");
      const next = digits.slice();
      rest.forEach((c, j) => { next[i + j] = c; });
      const joined = next.join("").slice(0, LEN);
      onChange(joined);
      const lastIndex = Math.min(i + rest.length, LEN - 1);
      refs.current[lastIndex]?.focus();
      return;
    }
    setDigitAt(i, d);
    if (i < LEN - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
      setDigitAt(i - 1, "");
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < LEN - 1) refs.current[i + 1]?.focus();
  };

  const handlePaste = (i: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    const rest = text.slice(0, LEN - i).split("");
    const next = digits.slice();
    rest.forEach((c, j) => { next[i + j] = c; });
    const joined = next.join("").slice(0, LEN);
    onChange(joined);
    const lastIndex = Math.min(i + rest.length, LEN - 1);
    refs.current[lastIndex]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" dir="ltr">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={LEN}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
          className={`input-glass w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold text-[#111111] rounded-xl transition-all ${
            error ? "!border-red-400" : ""
          }`}
          style={{ height: "3.25rem" }}
          aria-label={`Digit ${i + 1} of ${LEN}`}
        />
      ))}
    </div>
  );
}
