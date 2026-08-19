"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import {
  DndContext, useDraggable, useDroppable, useSensor, useSensors, PointerSensor,
  DragOverlay, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";

type Lead = {
  id: string;
  name: string | null;
  channel: string | null;
  status: string;
  phone: string | null;
  email?: string | null;
  form_data?: { message?: string; service?: string; preferred_datetime?: string | null } | null;
  last_message?: string;
  created_at: string | null;
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

// FIX 6 (round F): real Lead Detail Modal -- opens on card click, shows the
// actual captured lead data (no fields invented), and a working status
// dropdown to move the lead between pipeline stages. Kept as-is in round G
// alongside real drag-and-drop (see DraggableLeadCard/DroppableColumn below)
// -- the dropdown remains the accessible/keyboard/no-mouse way to move a
// lead, drag is the fast way, neither replaces the other.
function LeadDetailModal({
  lead, saving, onStatusChange, onDelete, onClose,
}: {
  lead: Lead;
  saving: boolean;
  onStatusChange: (status: Stage) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-[#F3F4F6] flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center text-sm font-bold text-[#374151] shrink-0">
              {(lead.name ?? "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-[#111111] truncate">{lead.name ?? t("dashboard.unknown")}</h3>
              <span className="flex items-center gap-1 text-[10px] font-medium text-[#6B7280] capitalize">
                <ChannelIcon channel={lead.channel} />
                {lead.channel ?? "web"} · {timeAgo(lead.created_at, t)}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151] shrink-0 p-1">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-3">
          {lead.phone && (
            <div>
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-0.5">{t("leads.detail.phone")}</p>
              <p className="text-sm text-[#111111] font-mono">{lead.phone}</p>
            </div>
          )}
          {lead.email && (
            <div>
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-0.5">{t("leads.detail.email")}</p>
              <p className="text-sm text-[#111111] break-all">{lead.email}</p>
            </div>
          )}
          {lead.form_data?.service && (
            <div>
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-0.5">{t("leads.detail.service")}</p>
              <p className="text-sm text-[#111111]">{lead.form_data.service}</p>
            </div>
          )}
          {lead.form_data?.message && (
            <div>
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-0.5">{t("leads.detail.message")}</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{lead.form_data.message}</p>
            </div>
          )}
          {!lead.phone && !lead.email && !lead.form_data?.service && !lead.form_data?.message && (
            <p className="text-xs text-[#9CA3AF]">{t("leads.detail.noDetails")}</p>
          )}
        </div>

        <div className="p-5 border-t border-[#F3F4F6]">
          <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-1.5">{t("leads.detail.stage")}</p>
          <select
            value={lead.status}
            disabled={saving}
            onChange={(e) => onStatusChange(e.target.value as Stage)}
            className="w-full text-sm font-semibold text-[#111111] bg-white border border-[#E5E7EB] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#FF6B35]/50 disabled:opacity-50 transition-colors"
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>{t(STAGE_LABEL_KEYS[s])}</option>
            ))}
          </select>

          {confirmDelete ? (
            <div className="mt-3 flex items-center gap-2">
              <button onClick={onDelete}
                className="flex-1 text-xs font-bold px-3 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors">
                {t("leads.detail.confirmDelete")}
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 text-xs font-bold px-3 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
                {t("leads.detail.cancelDelete")}
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="mt-3 w-full text-xs font-bold px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors">
              {t("leads.detail.delete")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// FIX 6 (round G): real cross-column drag-and-drop, backed by @dnd-kit/core
// (touch/pointer/mouse all handled by its PointerSensor via the unified
// Pointer Events API -- unlike native HTML5 draggable=, which has no touch
// equivalent at all). activationConstraint distance below lets a plain tap
// still fire onClick to open the detail modal; only a real drag (>8px of
// movement) engages dnd-kit.
function DraggableLeadCard({ lead, onOpen, t }: { lead: Lead; onOpen: () => void; t: (key: string) => string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onOpen}
      {...listeners}
      {...attributes}
      className={`text-left bg-white rounded-xl border border-[#E5E7EB] p-4 hover:border-[#FF6B35]/30 hover:shadow-sm transition-all duration-150 w-full touch-none ${isDragging ? "opacity-30" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#374151] shrink-0">
            {(lead.name ?? "?")[0].toUpperCase()}
          </div>
          <p className="text-xs font-semibold text-[#111111] truncate">{lead.name ?? t("dashboard.unknown")}</p>
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
        <span className="text-[10px] text-[#9CA3AF]">{timeAgo(lead.created_at, t)}</span>
      </div>
    </button>
  );
}

function DroppableColumn({ stage, children }: { stage: Stage; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className={`flex flex-col gap-2 rounded-xl transition-colors ${isOver ? "bg-[#FFF5F0] ring-2 ring-[#FF6B35]/40" : ""}`} style={{ minHeight: 60 }}>
      {children}
    </div>
  );
}

function timeAgo(ts: string | null, t: (key: string) => string) {
  if (!ts) return "";
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return t("dashboard.timeNow");
  if (diff < 3600) return `${Math.floor(diff / 60)}${t("dashboard.timeMinutes")}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${t("dashboard.timeHours")}`;
  return `${Math.floor(diff / 86400)}${t("dashboard.timeDays")}`;
}

export default function LeadsPage() {
  const { t } = useI18n();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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

    // CRITICAL FIX: this query selected and sorted by leads.updated_at,
    // a column that has never existed on the leads table (confirmed live
    // via a direct query -- PostgREST returns error 42703, "column does
    // not exist"). The destructured `{ data }` never checked for an error,
    // so `data` stayed undefined and the page silently rendered as if
    // there were zero leads -- for every tenant, always, regardless of how
    // many real leads existed. Switched to created_at, a real column.
    // FIX 8: exclude soft-deleted leads (Recycle Bin). Fallback: if
    // migration_v30.sql (adds leads.deleted_at) hasn't run yet, PostgREST
    // rejects the whole query over one unknown column -- retry without the
    // filter rather than showing an empty page.
    let { data, error } = await db
      .from("leads")
      .select("id, name, channel, status, phone, email, form_data, created_at")
      .eq("tenant_id", tenant.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error?.code === "PGRST204" || error?.code === "42703") {
      console.warn("[leads] deleted_at column missing — run migration_v30.sql. Retrying without the filter.");
      ({ data, error } = await db
        .from("leads")
        .select("id, name, channel, status, phone, email, form_data, created_at")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false }));
    }

    if (error) console.error("[leads] query failed:", error.code, error.message);
    setLeads((data ?? []) as Lead[]);
    setLoading(false);
  }

  async function handleStatusChange(id: string, status: Stage) {
    setSavingStatus(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabase() as any;
    const { error } = await db.from("leads").update({ status }).eq("id", id);
    if (error) {
      console.error("[leads] status update failed:", error.code, error.message);
    } else {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    }
    setSavingStatus(false);
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = event;
    if (!over) return;
    const newStage = over.id as Stage;
    const lead = leads.find((l) => l.id === active.id);
    if (!lead || lead.status === newStage || !PIPELINE_STAGES.includes(newStage)) return;
    void handleStatusChange(lead.id, newStage);
  }

  // FIX 8: soft delete -- moves the lead to the Recycle Bin (Settings) rather
  // than discarding it. Only ever sets deleted_at; never removes the row.
  async function handleDeleteLead(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabase() as any;
    const { error } = await db.from("leads").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      console.error("[leads] soft delete failed:", error.code, error.message);
      return false;
    }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    return true;
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
        <button
          disabled
          title="Leads are captured automatically when customers contact you through connected channels"
          className="text-xs font-bold px-4 py-2.5 min-h-[40px] rounded-xl text-white opacity-40 cursor-not-allowed"
          style={{ background: "var(--vp-color)" }}>
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
                style={{ background: "var(--vp-color)" }}>
                {t("leads.connectChannel")}
              </Link>
            </div>
          ) : (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
                      <DroppableColumn stage={stage}>
                        {stageLeads.map((lead) => (
                          <DraggableLeadCard key={lead.id} lead={lead} onOpen={() => setSelectedId(lead.id)} t={t} />
                        ))}

                        {stageLeads.length === 0 && (
                          <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-5 text-center">
                            <p className="text-[11px] text-[#9CA3AF]">{t("leads.emptyColumn")}</p>
                          </div>
                        )}
                      </DroppableColumn>
                    </div>
                  );
                })}
              </div>
              <DragOverlay>
                {draggingId ? (() => {
                  const lead = leads.find((l) => l.id === draggingId);
                  if (!lead) return null;
                  return (
                    <div className="bg-white rounded-xl border border-[#FF6B35] shadow-xl p-4 w-64 rotate-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#374151] shrink-0">
                          {(lead.name ?? "?")[0].toUpperCase()}
                        </div>
                        <p className="text-xs font-semibold text-[#111111] truncate">{lead.name ?? t("dashboard.unknown")}</p>
                      </div>
                    </div>
                  );
                })() : null}
              </DragOverlay>
            </DndContext>
          )}
        </>
      )}

      {selectedId && (() => {
        const selectedLead = leads.find((l) => l.id === selectedId);
        if (!selectedLead) return null;
        return (
          <LeadDetailModal
            lead={selectedLead}
            saving={savingStatus}
            onStatusChange={(status) => handleStatusChange(selectedLead.id, status)}
            onDelete={async () => {
              const ok = await handleDeleteLead(selectedLead.id);
              if (ok) setSelectedId(null);
            }}
            onClose={() => setSelectedId(null)}
          />
        );
      })()}
    </div>
  );
}
