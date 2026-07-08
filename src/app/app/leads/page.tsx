"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

type Lead = {
  id: string;
  name: string | null;
  channel: string | null;
  status: string;
  phone: string | null;
  last_message?: string;
  updated_at: string | null;
};

const PIPELINE_STAGES = ["new", "contacted", "qualified", "booked", "client"] as const;
type Stage = typeof PIPELINE_STAGES[number];

const STAGE_LABEL_KEYS: Record<Stage, string> = {
  new:       "leads.stages.new",
  contacted: "leads.stages.contacted",
  qualified: "leads.stages.qualified",
  booked:    "leads.stages.booked",
  client:    "leads.stages.client",
};

const STAGE_COLORS: Record<Stage, { dot: string }> = {
  new:       { dot: "#9CA3AF" },
  contacted: { dot: "#FF6B35" },
  qualified: { dot: "#F59E0B" },
  booked:    { dot: "#16A34A" },
  client:    { dot: "#7C3AED" },
};

function ChannelIcon({ channel }: { channel: string | null }) {
  if (channel === "instagram") return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="10" height="10" rx="3" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="9.2" cy="2.8" r="0.7" fill="currentColor"/>
    </svg>
  );
  if (channel === "whatsapp") return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M6 1a5 5 0 0 1 4.33 7.5L11 11l-2.62-.86A5 5 0 1 1 6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 6h10M6 1c-1.5 2-1.5 8 0 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function timeAgo(ts: string | null) {
  if (!ts) return "";
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function LeadsPage() {
  const { t } = useI18n();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabase() as any;
    const { data: { user } } = await db.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: tenant } = await db
      .from("tenants")
      .select("id")
      .eq("owner_id", user.id)
      .single();
    if (!tenant) { setLoading(false); return; }

    const { data } = await db
      .from("leads")
      .select("id, name, channel, status, phone, updated_at")
      .eq("tenant_id", tenant.id)
      .order("updated_at", { ascending: false });

    setLeads((data ?? []) as Lead[]);
    setLoading(false);
  }

  const filtered = leads.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.name ?? "").toLowerCase().includes(q) ||
      (l.channel ?? "").toLowerCase().includes(q) ||
      l.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#111111]">{t("leads.title")}</h1>
          {!loading && (
            <p className="text-sm text-[#6B7280] mt-1">
              {leads.length} {leads.length !== 1 ? t("leads.totalPlural") : t("leads.totalSingular")}
              {leads.filter((l) => l.status === "new").length > 0 && ` · ${leads.filter((l) => l.status === "new").length} ${t("leads.newCount")}`}
            </p>
          )}
        </div>
        <button className="text-xs font-bold px-4 py-2.5 min-h-[40px] rounded-xl text-white hover:opacity-90 transition-opacity" style={{ background: "#FF6B35" }}>
          {t("leads.addLead")}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <input type="text" placeholder={t("leads.searchPlaceholder")}
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E5E7EB] rounded-xl w-full text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors" />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {PIPELINE_STAGES.map((s) => (
            <div key={s} className="flex-shrink-0 w-64">
              <div className="flex items-center gap-2 mb-3 px-1 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-[#E5E7EB]" />
                <div className="h-2.5 bg-[#E5E7EB] rounded w-20" />
              </div>
              <div className="flex flex-col gap-2">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-4 animate-pulse">
                    <div className="h-2.5 bg-[#F3F4F6] rounded w-2/3 mb-2" />
                    <div className="h-2 bg-[#F3F4F6] rounded w-full mb-3" />
                    <div className="h-2 bg-[#F3F4F6] rounded w-1/3" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kanban board */}
      {!loading && (
        <>
          {leads.length === 0 && !search ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white rounded-2xl border border-[#E5E7EB]">
              <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mb-4">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 3C7 3 4 6 4 10s3 7 7 7 7-3 7-7-3-7-7-7z" stroke="#9CA3AF" strokeWidth="1.4"/>
                  <path d="M11 7v4M11 15h.01" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm font-bold text-[#374151] mb-1">{t("leads.noLeadsGlobal")}</p>
              <p className="text-xs text-[#9CA3AF] mb-4 max-w-xs">
                {t("leads.leadsHint")}
              </p>
              <Link href="/app/channels"
                className="text-xs font-bold px-4 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity"
                style={{ background: "#FF6B35" }}>
                {t("leads.connectChannel")}
              </Link>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-6 -mx-1 px-1" style={{ scrollSnapType: "x mandatory" }}>
              {PIPELINE_STAGES.map((stage) => {
                const stageLeads = filtered.filter((l) => l.status === stage);
                const colors = STAGE_COLORS[stage];
                return (
                  <div key={stage} className="flex-shrink-0 w-64" style={{ scrollSnapAlign: "start" }}>
                    {/* Column header */}
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colors.dot }} />
                        <span className="text-xs font-bold text-[#374151]">{t(STAGE_LABEL_KEYS[stage])}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
                        {stageLeads.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex flex-col gap-2">
                      {stageLeads.map((lead) => (
                        <div key={lead.id}
                          className="bg-white rounded-xl border border-[#E5E7EB] p-4 hover:border-[#FF6B35]/30 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all duration-150">
                          <div className="flex items-start justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#374151] shrink-0">
                                {(lead.name ?? "?")[0].toUpperCase()}
                              </div>
                              <p className="text-xs font-semibold text-[#111111] truncate">{lead.name ?? "Unknown"}</p>
                            </div>
                            <span className="flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] shrink-0 whitespace-nowrap capitalize">
                              <ChannelIcon channel={lead.channel} />
                              {lead.channel ?? "web"}
                            </span>
                          </div>
                          {lead.phone && (
                            <p className="text-[10px] text-[#6B7280] mb-2 font-mono">{lead.phone}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[#9CA3AF]">{timeAgo(lead.updated_at)}</span>
                          </div>
                        </div>
                      ))}

                      {stageLeads.length === 0 && (
                        <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-5 text-center">
                          <p className="text-[11px] text-[#9CA3AF]">{t("leads.emptyColumn")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
