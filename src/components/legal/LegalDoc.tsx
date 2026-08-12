"use client";

import { useState } from "react";
import Link from "next/link";

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "sub"; id?: string; title: string; blocks: LegalBlock[] }
  | { type: "note"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] };

export type LegalSection = {
  id: string;
  title: string;
  blocks: LegalBlock[];
};

function Block({ block, level }: { block: LegalBlock; level: number }) {
  switch (block.type) {
    case "p":
      return (
        <p className="leading-relaxed text-[#374151] dark:text-[#B9B9C2]">
          {block.text}
        </p>
      );
    case "ul":
      return (
        <ul className="list-disc pl-5 space-y-1.5 leading-relaxed text-[#374151] dark:text-[#B9B9C2]">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed text-[#374151] dark:text-[#B9B9C2]">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    case "note":
      return (
        <div className="rounded-xl border border-[#FDBA74] bg-[#FFF7ED] dark:border-[#7C4A22] dark:bg-[#231708] px-4 py-3">
          <p className="text-sm leading-relaxed text-[#9A3412] dark:text-[#F4A968]">
            {block.text}
          </p>
        </div>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] dark:border-[#2A2A32]">
          <table className="w-full text-sm border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-[#F9FAFB] dark:bg-[#1E1E24]">
                {block.headers.map((h, i) => (
                  <th
                    key={i}
                    className="text-left font-semibold text-[#111111] dark:text-[#EDEDEF] px-4 py-2.5 border-b border-[#E5E7EB] dark:border-[#2A2A32]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 1 ? "bg-[#FAFAFA] dark:bg-[#17171C]" : ""}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="align-top px-4 py-2.5 text-[#374151] dark:text-[#B9B9C2] border-b border-[#F3F4F6] dark:border-[#232329]"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "sub":
      return (
        <div id={block.id} className="scroll-mt-24 space-y-3">
          <h3 className="text-base font-semibold text-[#111111] dark:text-[#EDEDEF]">
            {block.title}
          </h3>
          <div className="space-y-3">
            {block.blocks.map((b, i) => (
              <Block key={i} block={b} level={level + 1} />
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default function LegalDoc({
  eyebrow = "Legal",
  title,
  lastUpdated,
  intro,
  sections,
}: {
  eyebrow?: string;
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}) {
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  return (
    <div id="top" className="w-full max-w-[1180px] mx-auto px-5 md:px-6">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF] dark:text-[#6E6E76] mb-3">
          {eyebrow}
        </p>
        <h1
          className="text-3xl md:text-4xl font-extrabold text-[#111111] dark:text-[#EDEDEF] mb-3"
          style={{ letterSpacing: "-0.03em" }}
        >
          {title}
        </h1>
        <p className="text-sm text-[#9CA3AF] dark:text-[#6E6E76] mb-4">Last updated: {lastUpdated}</p>
        <p className="leading-relaxed text-[#374151] dark:text-[#B9B9C2]">{intro}</p>
      </div>

      {/* Mobile contents toggle */}
      <div className="lg:hidden mb-6">
        <button
          onClick={() => setMobileTocOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#E5E7EB] dark:border-[#2A2A32] bg-white dark:bg-[#17171C] text-sm font-semibold text-[#111111] dark:text-[#EDEDEF]"
        >
          Contents
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={`transition-transform ${mobileTocOpen ? "rotate-180" : ""}`}
          >
            <path d="M2.5 4.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {mobileTocOpen && (
          <nav className="mt-2 p-3 rounded-xl border border-[#E5E7EB] dark:border-[#2A2A32] bg-white dark:bg-[#17171C] max-h-80 overflow-y-auto">
            <ul className="space-y-0.5">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={() => setMobileTocOpen(false)}
                    className="block text-sm py-1.5 px-2 rounded-lg text-[#6B7280] dark:text-[#9B9BA3] hover:text-[#111111] dark:hover:text-[#EDEDEF] hover:bg-[#F9FAFB] dark:hover:bg-[#1E1E24]"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10 lg:items-start">
        {/* Desktop sticky TOC */}
        <nav className="hidden lg:block sticky top-8 self-start max-h-[calc(100vh-4rem)] overflow-y-auto pb-10">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] dark:text-[#6E6E76] mb-3">
            Contents
          </p>
          <ul className="space-y-0.5 border-l border-[#E5E7EB] dark:border-[#2A2A32]">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block text-[13px] leading-snug py-1.5 pl-3 -ml-px border-l-2 border-transparent text-[#6B7280] dark:text-[#9B9BA3] hover:text-[#111111] dark:hover:text-[#EDEDEF] hover:border-[#FF6B35] transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main content */}
        <div className="max-w-[820px] space-y-10 pb-16">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-8 space-y-4">
              <h2 className="text-xl font-bold text-[#111111] dark:text-[#EDEDEF] pb-2 border-b border-[#F3F4F6] dark:border-[#232329]">
                {s.title}
              </h2>
              <div className="space-y-4">
                {s.blocks.map((b, i) => (
                  <Block key={i} block={b} level={1} />
                ))}
              </div>
            </section>
          ))}

          <div className="pt-8 border-t border-[#E5E7EB] dark:border-[#2A2A32] flex items-center justify-between flex-wrap gap-3">
            <Link href="/" className="text-sm font-medium" style={{ color: "var(--vp-color)" }}>
              ← Back to home
            </Link>
            <a href="#top" className="text-sm text-[#9CA3AF] dark:text-[#6E6E76] hover:text-[#111111] dark:hover:text-[#EDEDEF]">
              Back to top ↑
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
