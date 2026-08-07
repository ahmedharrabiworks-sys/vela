"use client";

import { openTrialModal } from "@/lib/useTrialModalState";

interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function TrialCTAButton({ children, className, style }: Props) {
  return (
    <button onClick={openTrialModal} className={className} style={style}>
      {children}
    </button>
  );
}
