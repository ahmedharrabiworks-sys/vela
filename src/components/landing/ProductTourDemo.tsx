"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Scene indices ─────────────────────────────────────────── */
const CONV = 0, APPT = 1, LEADS_S = 2, CHAN = 3, AGENT = 4, ANALY = 5;
const SCENE_COUNT = 6;

/* ─── Auto-advance durations (ms) ──────────────────────────── */
const SCENE_MS = [18500, 4200, 4200, 4200, 4200, 4200];

/* ─── Chat animation script ─────────────────────────────────── */
type Msg = { role: "ai" | "user"; text: string; at: number };
const CHAT_MSGS: Msg[] = [
  { role: "ai",   at:  900,  text: "Hi! I'm Vela, your AI business assistant. How can I help?" },
  { role: "user", at: 2300,  text: "I'd like to book a dental cleaning" },
  { role: "ai",   at: 3600,  text: "Happy to help! What's your name?" },
  { role: "user", at: 5000,  text: "Sara Khalid" },
  { role: "ai",   at: 6200,  text: "Got it, Sara! Your phone number?" },
  { role: "user", at: 7600,  text: "+971 50 123 4567" },
  { role: "ai",   at: 8700,  text: "What date works best for you?" },
  { role: "user", at: 10100, text: "Tuesday afternoon please" },
  { role: "ai",   at: 11200, text: "I have Tuesday at 3:00 PM. Shall I confirm?" },
  { role: "user", at: 12600, text: "Yes, perfect!" },
];
const CONFIRM_AT = 13800;

/* ─── Appointments data ─────────────────────────────────────── */
type ApptRow = {
  i: string; name: string; phone: string;
  service: string; time: string;
  ch: "WA" | "IG" | "WEB"; status: "Confirmed" | "Pending" | "Cancelled";
};
const APPTS: ApptRow[] = [
  { i:"SK", name:"Sara Khalid",     phone:"+971 50 123 4567", service:"Dental Cleaning",  time:"09:00", ch:"WA",  status:"Confirmed" },
  { i:"RM", name:"Rania Mahmoud",   phone:"+971 52 345 6789", service:"Teeth Whitening",  time:"09:45", ch:"IG",  status:"Confirmed" },
  { i:"MH", name:"Mohammed Hassan", phone:"+971 55 456 7890", service:"Teeth Whitening",  time:"10:30", ch:"IG",  status:"Confirmed" },
  { i:"LM", name:"Layla Mansouri",  phone:"+971 55 987 6543", service:"Dental Cleaning",  time:"11:00", ch:"WA",  status:"Confirmed" },
  { i:"KI", name:"Khaled Ibrahim",  phone:"+971 50 456 7890", service:"Cavity Filling",   time:"12:00", ch:"WEB", status:"Pending"   },
  { i:"FN", name:"Fatima Nasser",   phone:"",                 service:"Root Canal",        time:"13:30", ch:"IG",  status:"Cancelled" },
];

/* ─── Leads / CRM data ──────────────────────────────────────── */
type Lead = { i: string; name: string; time: string; ch: "WA" | "IG" | "WEB"; phone: string };
const LEAD_COLS: { label: string; color: string; leads: Lead[] }[] = [
  { label:"New",       color:"#6B7280",
    leads:[
      { i:"SK", name:"Sara Khalid",     time:"2m ago",  ch:"WA",  phone:"+971 50 123 4567" },
      { i:"MH", name:"Mohammed Hassan", time:"5m ago",  ch:"IG",  phone:"" },
    ]},
  { label:"Contacted", color:"#3B82F6",
    leads:[
      { i:"LM", name:"Layla Mansouri",  time:"18m ago", ch:"WA",  phone:"+971 55 887 6543" },
      { i:"OA", name:"Omar Al-Farsi",   time:"1h ago",  ch:"WA",  phone:"+971 56 234 5678" },
    ]},
  { label:"Qualified",  color:"#8B5CF6",
    leads:[
      { i:"FN", name:"Fatima Nasser",   time:"3h ago",  ch:"IG",  phone:"" },
      { i:"RM", name:"Rania Mahmoud",   time:"5h ago",  ch:"WA",  phone:"+971 52 345 6789" },
    ]},
  { label:"Booked",    color:"#F97316",
    leads:[
      { i:"KI", name:"Khaled Ibrahim",  time:"8h ago",  ch:"WA",  phone:"+971 50 456 7890" },
      { i:"NA", name:"Nour Al-Saad",    time:"12h ago", ch:"WEB", phone:"+971 54 567 8901" },
    ]},
  { label:"Client",    color:"#10B981",
    leads:[
      { i:"AQ", name:"Aisha Qasim",     time:"1d ago",  ch:"IG",  phone:"" },
      { i:"HY", name:"Hassan Youssef",  time:"2d ago",  ch:"WA",  phone:"+971 50 678 9012" },
    ]},
];

/* ─── Recent calls ──────────────────────────────────────────── */
type CallRow = { i: string; name: string; status:"Booked"|"Transferred"|"Resolved"; summary:string; dur:string; time:string };
const CALLS: CallRow[] = [
  { i:"SK", name:"Sara Khalid",     status:"Booked",      dur:"2:14", time:"09:41", summary:"Caller booked a dental cleaning for Tuesday at 11:00 AM. Confirmed name and contact details." },
  { i:"MH", name:"Mohammed Hassan", status:"Transferred", dur:"1:47", time:"09:35", summary:"Caller asked about whitening prices and payment plan options. Transferred to billing team." },
  { i:"LM", name:"Layla Mansouri",  status:"Booked",      dur:"3:22", time:"09:20", summary:"Caller booked a cleaning and asked about parking and procedure comfort." },
  { i:"RM", name:"Rania Mahmoud",   status:"Resolved",    dur:"0:58", time:"08:45", summary:"Caller confirmed their existing appointment and asked what to bring. Fully resolved." },
];

/* ─── Bar chart (calls this week) ──────────────────────────── */
const BAR_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const BAR_VALS = [17, 22, 19, 21, 24, 20, 15];

/* ─── Line chart (30-day leads) ─────────────────────────────── */
const LINE_DATA = [3,5,8,6,4,5,7,8,6,2,3,4,6,7,8,7,5,6,8,7,4,5,6,8,10,9,7,8,11,13];

/* ─── Avatar palette ─────────────────────────────────────────── */
const AV: Record<string,string> = {
  SK:"#1E3A5F", RM:"#7C3AED", MH:"#374151", LM:"#0D9488",
  KI:"#D97706", FN:"#5B21B6", NA:"#0891B2", OA:"#1D4ED8",
  HY:"#065F46", AQ:"#0E7490",
};

/* ─── Utility components ─────────────────────────────────────── */
function Av({ i, sz=28 }: { i:string; sz?:number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width:sz, height:sz, fontSize:sz*0.36, background:AV[i]??"#6B7280" }}
    >{i}</div>
  );
}

function ChBadge({ ch }: { ch:"WA"|"IG"|"WEB" }) {
  const m = {
    WA:  { bg:"#DCFCE7", color:"#16A34A" },
    IG:  { bg:"#FCE7F3", color:"#BE185D" },
    WEB: { bg:"#DBEAFE", color:"#1D4ED8" },
  }[ch];
  return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={m}>{ch}</span>;
}

function StatusPill({ s }: { s:ApptRow["status"] }) {
  const m = {
    Confirmed: { dot:"#22C55E", text:"#16A34A", bg:"#F0FDF4" },
    Pending:   { dot:"#F59E0B", text:"#B45309", bg:"#FFFBEB" },
    Cancelled: { dot:"#EF4444", text:"#DC2626", bg:"#FEF2F2" },
  }[s];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color:m.text, background:m.bg }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:m.dot }} />
      {s}
    </span>
  );
}

function CallPill({ s }: { s:CallRow["status"] }) {
  const m = {
    Booked:      { text:"#C2410C", bg:"#FFF5F0" },
    Transferred: { text:"#2563EB", bg:"#EFF6FF" },
    Resolved:    { text:"#16A34A", bg:"#F0FDF4" },
  }[s];
  return <span className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={m}>{s}</span>;
}

/* ─── Scene header (shared) ─────────────────────────────────── */
function SceneHdr({ title, sub, btn }: { title:string; sub:string; btn:string }) {
  return (
    <div className="flex items-start justify-between px-4 pt-3 pb-2 shrink-0">
      <div>
        <h3 className="text-[15px] font-bold text-[#111111] leading-tight">{title}</h3>
        <p className="text-[11px] text-[#9CA3AF] mt-0.5">{sub}</p>
      </div>
      <button className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white whitespace-nowrap" style={{ background:"var(--vela-gradient)" }}>{btn}</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Scene 0 — Conversation
═══════════════════════════════════════════════════════════════ */
function SceneConversation() {
  const [shown, setShown]       = useState<Msg[]>([]);
  const [typing, setTyping]     = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    setShown([]); setTyping(false); setConfirmed(false);
    CHAT_MSGS.forEach(msg => {
      if (msg.role === "ai") t.push(setTimeout(() => setTyping(true), msg.at - 900));
      t.push(setTimeout(() => { setTyping(false); setShown(p => [...p, msg]); }, msg.at));
    });
    t.push(setTimeout(() => setConfirmed(true), CONFIRM_AT));
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* App header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#F1F5F9] shrink-0" style={{ background:"#FAFAFA" }}>
        <Image src="/assets/logo-full.png" alt="Vela" height={20} width={80} className="object-contain" unoptimized priority />
        <div className="w-px h-4 bg-[#E5E7EB]" />
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px] text-[#6B7280] font-medium">AI Assistant · Online</span>
        </div>
        <div className="ml-auto flex gap-1">
          {["IG","WA","Web"].map(l => (
            <span key={l} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#6B7280] font-semibold border border-[#E5E7EB]">{l}</span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end px-4 py-3 gap-2" style={{ background:"#F8FAFC" }}>
        <AnimatePresence initial={false}>
          {shown.map((msg, idx) => (
            <motion.div key={idx}
              initial={{ opacity:0, y:10, scale:0.97 }}
              animate={{ opacity:1, y:0, scale:1 }}
              transition={{ duration:0.3, ease:[0.22,1,0.36,1] }}
              className={`flex gap-2 ${msg.role==="user"?"justify-end":"justify-start"}`}
            >
              {msg.role==="ai" && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5" style={{ background:"var(--vela-gradient)" }}>V</div>
              )}
              <div className="max-w-[72%] px-3 py-2 rounded-2xl text-[12px] leading-relaxed"
                style={msg.role==="user"
                  ? { background:"var(--vela-gradient)", color:"white", borderBottomRightRadius:4 }
                  : { background:"white", color:"#374151", border:"1px solid #E5E7EB", borderBottomLeftRadius:4 }}
              >{msg.text}</div>
            </motion.div>
          ))}

          {typing && (
            <motion.div key="typing" initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} transition={{ duration:0.2 }} className="flex items-end gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ background:"var(--vela-gradient)" }}>V</div>
              <div className="flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-bl-sm bg-white border border-[#E5E7EB]">
                {[0,1,2].map(j => (
                  <motion.span key={j} className="block w-1.5 h-1.5 rounded-full bg-[#94A3B8]"
                    animate={{ y:[0,-4,0] }} transition={{ duration:0.65, delay:j*0.14, repeat:Infinity }} />
                ))}
              </div>
            </motion.div>
          )}

          {confirmed && (
            <motion.div key="confirm"
              initial={{ opacity:0, scale:0.88, y:12 }}
              animate={{ opacity:1, scale:1, y:0 }}
              transition={{ duration:0.55, ease:[0.22,1,0.36,1] }}
              className="mx-2 rounded-2xl overflow-hidden"
              style={{ background:"linear-gradient(135deg,#052e16 0%,#14532d 100%)", border:"1px solid rgba(34,197,94,0.3)" }}
            >
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5.5l2 2 5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <p className="text-green-300 text-[10px] font-bold uppercase tracking-wide">Appointment Confirmed!</p>
                  </div>
                  <p className="text-white text-sm font-semibold">Sara Khalid</p>
                  <p className="text-white/60 text-xs mt-0.5">Dental Cleaning · Tuesday, 3:00 PM</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <svg width="10" height="10" viewBox="0 0 11 11" fill="none" style={{ color:"rgba(255,255,255,0.4)" }}><rect x="1" y="2" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M3.5 1v2M7.5 1v2M1 5h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    <span className="text-white/40 text-[10px]">Booked via Vela AI · Reminder sent</span>
                  </div>
                </div>
                <motion.div initial={{ opacity:0, scale:0.5, rotate:-10 }} animate={{ opacity:1, scale:1, rotate:0 }} transition={{ duration:0.5, delay:0.2, ease:[0.34,1.56,0.64,1] }}>
                  <Image src="/assets/mascot.png" alt="Vela" width={52} height={52} className="object-contain drop-shadow-lg" unoptimized />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[#F1F5F9] bg-white shrink-0">
        <div className="flex-1 h-8 rounded-full flex items-center px-4 text-xs text-[#9CA3AF]" style={{ background:"#F8FAFC", border:"1px solid #E5E7EB" }}>Message...</div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background:"var(--vela-gradient)" }}>
          <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M1.5 6.5h10M7.5 2.5l4 4-4 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Scene 1 — Appointments
═══════════════════════════════════════════════════════════════ */
function SceneAppointments() {
  return (
    <div className="flex flex-col h-full" style={{ background:"linear-gradient(135deg,white 62%,rgba(237,84,38,0.07) 100%)" }}>
      <SceneHdr title="Appointments" sub="Today - Jul 21, 2026" btn="+ New Appointment" />

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 px-4 mb-2 shrink-0">
        {[{val:"10",label:"Today"},{val:"6",label:"Confirmed"},{val:"3",label:"Pending"}].map(({val,label})=>(
          <div key={label} className="border border-[#E5E7EB] rounded-xl p-3 text-center bg-white">
            <p className="text-xl font-black text-[#111111] leading-none">{val}</p>
            <p className="text-[10px] text-[#9CA3AF] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 px-4 mb-1 shrink-0">
        {[{l:"All",n:10,a:true},{l:"Confirmed",n:6},{l:"Pending",n:3},{l:"Cancelled",n:1}].map(({l,n,a})=>(
          <button key={l} className={`text-[11px] font-semibold pb-1.5 flex items-center gap-1 border-b-2 ${a?"text-[#ed5426] border-[#ed5426]":"text-[#6B7280] border-transparent"}`}>
            {l}<span className={`text-[10px] ${a?"text-[#ed5426]":"text-[#9CA3AF]"}`}>{n}</span>
          </button>
        ))}
      </div>
      <div className="h-px bg-[#E5E7EB] mx-4 mb-1 shrink-0" />

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full" style={{ minWidth:560 }}>
            <thead>
              <tr className="border-b border-[#F3F4F6]">
                {["NAME","SERVICE","TIME","CHANNEL","STATUS"].map(h=>(
                  <th key={h} className="text-left text-[9px] font-semibold text-[#9CA3AF] px-3 py-2 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {APPTS.map(row=>(
                <tr key={row.name} className="border-b border-[#F9FAFB]">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Av i={row.i} sz={24} />
                      <span className="text-[11px] font-semibold text-[#111111] whitespace-nowrap">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-[#374151] whitespace-nowrap">{row.service}</td>
                  <td className="px-3 py-2">
                    <p className="text-[11px] font-bold text-[#111111]">{row.time}</p>
                    <p className="text-[10px] text-[#9CA3AF]">Jul 21</p>
                  </td>
                  <td className="px-3 py-2"><ChBadge ch={row.ch} /></td>
                  <td className="px-3 py-2"><StatusPill s={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Scene 2 — Leads / CRM
═══════════════════════════════════════════════════════════════ */
function SceneLeads() {
  return (
    <div className="flex flex-col h-full" style={{ background:"linear-gradient(135deg,white 62%,rgba(237,84,38,0.07) 100%)" }}>
      <SceneHdr title="Leads / CRM" sub="10 leads across 5 stages" btn="+ Add Lead" />

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 pb-3">
        <div className="flex gap-3 h-full" style={{ minWidth:780 }}>
          {LEAD_COLS.map(col=>(
            <div key={col.label} className="flex flex-col shrink-0" style={{ width:152 }}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background:col.color }} />
                <span className="text-[11px] font-semibold text-[#374151]">{col.label}</span>
                <span className="text-[10px] font-bold w-4 h-4 rounded-full bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center shrink-0">{col.leads.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {col.leads.map(lead=>(
                  <div key={lead.name} className="bg-white rounded-xl border border-[#E5E7EB] p-2.5 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Av i={lead.i} sz={26} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-[#111111] truncate leading-tight">{lead.name}</p>
                        <p className="text-[10px] text-[#9CA3AF] leading-tight">{lead.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <ChBadge ch={lead.ch} />
                      {lead.phone && <span className="text-[9px] text-[#9CA3AF] truncate">{lead.phone.slice(0,12)}</span>}
                    </div>
                  </div>
                ))}
                <button className="text-[10px] text-[#9CA3AF] border border-dashed border-[#E5E7EB] rounded-xl py-2 text-center">+ Add</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Scene 3 — Channels
═══════════════════════════════════════════════════════════════ */
function SceneChannels() {
  const channels = [
    {
      iconBg:"linear-gradient(45deg,#833AB4,#FD1D1D,#F77737)",
      icon:<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
      name:"Instagram", handle:"@ahmeddentalclinic",
      stats:[{val:"312",label:"DMs handled"},{val:"< 1 min",label:"Avg response"}],
    },
    {
      iconBg:"#25D366",
      icon:<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
      name:"WhatsApp Business", handle:"+971 4 123 4567",
      stats:[{val:"535",label:"Messages handled"},{val:"47",label:"Bookings via WA"}],
    },
    {
      iconBg:"#6366F1",
      icon:<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>,
      name:"Website Chat", handle:"ahmeddentalclinic.ae",
      stats:[{val:"1,240",label:"Website visitors"},{val:"8.3%",label:"Chat conversions"}],
    },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background:"linear-gradient(135deg,white 62%,rgba(237,84,38,0.07) 100%)" }}>
      <SceneHdr title="Channels" sub="Connected messaging channels" btn="+ Connect" />

      {/* All-connected banner */}
      <div className="mx-4 mb-2 px-3 py-2 rounded-xl flex items-center gap-2 shrink-0" style={{ background:"#F0FDF4", border:"1px solid #BBF7D0" }}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 6.5l3 3 7-6" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span className="text-[10px] font-medium text-[#15803D]">All 3 channels connected. Your AI agent is live across Instagram, WhatsApp, and your website.</span>
      </div>

      {/* Channel cards */}
      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2 pb-3">
        {channels.map(ch=>(
          <div key={ch.name} className="bg-white border border-[#E5E7EB] rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:ch.iconBg }}>{ch.icon}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[13px] font-bold text-[#111111]">{ch.name}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background:"#F0FDF4", color:"#16A34A" }}>Connected</span>
                  </div>
                  <p className="text-[10px] text-[#9CA3AF] truncate">{ch.handle}</p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button className="text-[10px] font-medium px-2 py-1 rounded-lg border border-[#E5E7EB] text-[#374151]">Manage</button>
                <button className="text-[10px] font-medium px-2 py-1 rounded-lg border border-[#FECACA] text-[#DC2626]">Disconnect</button>
              </div>
            </div>
            <div className="flex gap-6 mt-2 pl-[52px]">
              {ch.stats.map(({val,label})=>(
                <div key={label}>
                  <p className="text-[13px] font-black text-[#111111] leading-none">{val}</p>
                  <p className="text-[10px] text-[#9CA3AF]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Scene 4 — AI Agent
═══════════════════════════════════════════════════════════════ */
function SceneAgent() {
  const maxBar = Math.max(...BAR_VALS);
  const barH = 84, barW = 28, barGap = 36;
  const r = 36, circ = 2*Math.PI*r, fill = circ*0.94;

  return (
    <div className="flex flex-col h-full" style={{ background:"linear-gradient(135deg,white 62%,rgba(237,84,38,0.07) 100%)" }}>
      <SceneHdr title="AI Phone Agent" sub="Your 24/7 voice AI assistant" btn="Test Voice Agent" />

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-2 shrink-0">
        {[
          { val:"847",  label:"Total Calls"   },
          { val:"94%",  label:"Resolved by AI"},
          { val:"2:34", label:"Avg Duration"  },
          { val:"132",  label:"This Week",  sub:"+12%" },
        ].map(({val,label,sub})=>(
          <div key={label} className="border border-[#E5E7EB] rounded-xl p-2 bg-white">
            <p className="text-base font-black text-[#111111] leading-none">{val}</p>
            <p className="text-[9px] text-[#9CA3AF] mt-0.5 leading-tight">{label}</p>
            {sub&&<p className="text-[9px] font-bold text-green-600 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="flex gap-2 px-4 mb-2 shrink-0">
        {/* Bar chart */}
        <div className="flex-1 bg-white border border-[#E5E7EB] rounded-xl p-2.5">
          <p className="text-[10px] font-semibold text-[#374151] mb-1.5">Calls This Week</p>
          <svg width="100%" height={barH+16} viewBox={`0 0 ${BAR_DAYS.length*barGap} ${barH+16}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="ptBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ed5426" />
                <stop offset="100%" stopColor="#f59e6b" />
              </linearGradient>
            </defs>
            {BAR_VALS.map((v,i)=>{
              const bh=(v/maxBar)*barH;
              return (
                <g key={i}>
                  <rect x={i*barGap+4} y={barH-bh} width={barW} height={bh} rx={3} fill="url(#ptBarGrad)" />
                  <text x={i*barGap+4+barW/2} y={barH+13} textAnchor="middle" fontSize="8" fill="#9CA3AF">{BAR_DAYS[i]}</text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Ring chart */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-2.5 flex flex-col items-center justify-center shrink-0" style={{ width:96 }}>
          <svg width="76" height="76" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r={r} fill="none" stroke="#F3F4F6" strokeWidth="9"/>
            <circle cx="45" cy="45" r={r} fill="none" stroke="#ed5426" strokeWidth="9"
              strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" transform="rotate(-90 45 45)"/>
            <text x="45" y="50" textAnchor="middle" fontSize="17" fontWeight="800" fill="#111111">94%</text>
          </svg>
          <p className="text-[9px] font-semibold text-[#374151] text-center leading-tight mt-0.5">AI Resolution</p>
          <p className="text-[8px] text-[#9CA3AF] text-center">6% escalated</p>
        </div>
      </div>

      {/* Recent calls */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        <p className="text-[10px] font-bold text-[#374151] mb-1.5">Recent Calls</p>
        <div className="flex flex-col gap-1.5">
          {CALLS.map((call,ci)=>(
            <div key={call.name} className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2">
              <div className="flex items-start gap-2">
                <Av i={call.i} sz={24} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-semibold text-[#111111]">{call.name}</span>
                    <CallPill s={call.status} />
                  </div>
                  {ci===0 && <p className="text-[10px] text-[#9CA3AF] leading-tight line-clamp-2">{call.summary}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold text-[#374151]">{call.dur}</p>
                  <p className="text-[9px] text-[#9CA3AF]">{call.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Scene 5 — Analytics
═══════════════════════════════════════════════════════════════ */
function SceneAnalytics() {
  const cW=400, cH=90;
  const minV=Math.min(...LINE_DATA), maxV=Math.max(...LINE_DATA);
  const pts = LINE_DATA.map((v,i)=>`${(i/(LINE_DATA.length-1))*cW},${cH-((v-minV)/(maxV-minV))*cH}`);
  const pathD=`M ${pts.join(" L ")}`;
  const areaD=`${pathD} L ${cW},${cH} L 0,${cH} Z`;
  const lastY = cH-((LINE_DATA[LINE_DATA.length-1]-minV)/(maxV-minV))*cH;

  return (
    <div className="flex flex-col h-full" style={{ background:"linear-gradient(135deg,white 62%,rgba(237,84,38,0.07) 100%)" }}>
      <div className="flex items-start justify-between px-4 pt-3 pb-2 shrink-0">
        <div>
          <h3 className="text-[15px] font-bold text-[#111111] leading-tight">Analytics</h3>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">Ahmed Dental Clinic - last 30 days</p>
        </div>
        <div className="flex items-center gap-1">
          {["7d","30d","90d"].map(t=>(
            <button key={t} className={`text-[10px] px-2 py-1 rounded-lg font-bold ${t==="30d"?"text-white":"text-[#6B7280]"}`}
              style={t==="30d"?{background:"var(--vela-gradient)"}:{}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-2 shrink-0">
        {[
          {label:"Total Leads",         val:"167",pct:"+23%"},
          {label:"Conversations",       val:"225",pct:"+18%"},
          {label:"Appts Booked",        val:"100",pct:"+31%"},
          {label:"AI Resolution",       val:"94%", pct:"+2%" },
        ].map(({label,val,pct})=>(
          <div key={label} className="border border-[#E5E7EB] rounded-xl p-2 bg-white">
            <div className="flex items-start justify-between gap-1 mb-1">
              <span className="text-[9px] text-[#9CA3AF] font-medium leading-tight">{label}</span>
              <span className="text-[9px] font-bold text-green-600 shrink-0">{pct}</span>
            </div>
            <p className="text-base font-black text-[#111111] leading-none">{val}</p>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div className="mx-4 bg-white border border-[#E5E7EB] rounded-xl p-2.5 mb-2 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-semibold text-[#374151]">New Leads over time</p>
          <div className="flex gap-1">
            {["Leads","Convs","Appts"].map(t=>(
              <button key={t} className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${t==="Leads"?"text-white":"text-[#9CA3AF]"}`}
                style={t==="Leads"?{background:"var(--vela-gradient)"}:{}}>{t}</button>
            ))}
          </div>
        </div>
        <svg width="100%" height={cH+20} viewBox={`0 0 ${cW} ${cH+20}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="ptLineArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(237,84,38,0.18)"/>
              <stop offset="100%" stopColor="rgba(237,84,38,0)"/>
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#ptLineArea)"/>
          <path d={pathD} fill="none" stroke="#ed5426" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx={cW} cy={lastY} r="3.5" fill="#ed5426"/>
          {["/21","6/26","7/1","7/6","7/11","7/16","7/20"].map((lbl,i)=>(
            <text key={i} x={(i/6)*cW} y={cH+16} textAnchor="middle" fontSize="8" fill="#9CA3AF">{lbl}</text>
          ))}
        </svg>
      </div>

      {/* Channel breakdown */}
      <div className="mx-4 bg-white border border-[#E5E7EB] rounded-xl p-2.5 flex-1 overflow-hidden">
        <p className="text-[10px] font-semibold text-[#374151] mb-2">Channel Breakdown</p>
        <div className="grid grid-cols-4 text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1">
          <span>Channel</span><span>Leads</span><span>Convs</span><span>Share</span>
        </div>
        {[
          {name:"WhatsApp", color:"#25D366", leads:74, convs:98, pct:44},
          {name:"Instagram",color:"#E1306C", leads:58, convs:79, pct:35},
          {name:"Website",  color:"#6366F1", leads:35, convs:48, pct:21},
        ].map(({name,color,leads,convs,pct})=>(
          <div key={name} className="grid grid-cols-4 items-center py-1.5 border-t border-[#F3F4F6]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{background:color}}/>
              <span className="text-[11px] text-[#374151]">{name}</span>
            </div>
            <span className="text-[11px] text-[#374151]">{leads}</span>
            <span className="text-[11px] text-[#374151]">{convs}</span>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden">
                <div className="h-full rounded-full" style={{width:`${pct}%`, background:color}}/>
              </div>
              <span className="text-[10px] text-[#374151] font-semibold">{pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Feature cards config
═══════════════════════════════════════════════════════════════ */
const FEATURE_CARDS = [
  {
    sceneIdx: CONV,
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M15 10.5a1.5 1.5 0 01-1.5 1.5H5.25L2.5 15V4a1.5 1.5 0 011.5-1.5h10A1.5 1.5 0 0115 4v6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
    title: "AI replies 24/7",
    desc:  "Instagram, WhatsApp, and website: all handled automatically.",
  },
  {
    sceneIdx: AGENT,
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5.5A2.5 2.5 0 015.5 3h.5a1 1 0 01.95.684l.9 2.7a1 1 0 01-.273 1.054l-.9.9A9 9 0 009.66 11.32l.9-.9a1 1 0 011.054-.273l2.7.9A1 1 0 0115 12.01V12.5A2.5 2.5 0 0112.5 15C7.253 15 3 10.747 3 5.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    title: "Voice phone agent",
    desc:  "Answers inbound calls, qualifies leads, books appointments.",
  },
  {
    sceneIdx: LEADS_S,
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M12 16v-1.5A3 3 0 009 11.5H5a3 3 0 00-3 3V16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M16 16v-1.5A3 3 0 0014 11.7M13 3.1a3 3 0 010 5.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
    title: "Leads & CRM",
    desc:  "Every customer captured, tracked, and ready to follow up.",
  },
  {
    sceneIdx: ANALY,
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 14h14M5 14V9m3 5V6m3 8V4m3 10v-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    title: "Analytics",
    desc:  "Full-funnel insights across every channel and touchpoint.",
  },
] as const;

/* ─── Scene transition variants ─────────────────────────────── */
const sceneVariants = {
  enter:  { rotateY: 90 },
  center: { rotateY: 0,  transition:{ duration:0.28, ease:[0.22,1,0.36,1] as [number,number,number,number] } },
  exit:   { rotateY:-90, transition:{ duration:0.22, ease:[0.55,0,1,0.45]  as [number,number,number,number] } },
};

/* ═══════════════════════════════════════════════════════════════
   ProductTourDemo — main export
═══════════════════════════════════════════════════════════════ */
export default function ProductTourDemo() {
  const [scene, setScene] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-advance: re-registers whenever scene changes (including after manual click)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setScene(prev => (prev + 1) % SCENE_COUNT);
    }, SCENE_MS[scene]);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [scene]);

  const goToScene = useCallback((idx: number) => {
    if (idx === scene) return;
    setScene(idx);
  }, [scene]);

  function renderScene(s: number) {
    switch (s) {
      case CONV:    return <SceneConversation />;
      case APPT:    return <SceneAppointments />;
      case LEADS_S: return <SceneLeads />;
      case CHAN:    return <SceneChannels />;
      case AGENT:   return <SceneAgent />;
      case ANALY:   return <SceneAnalytics />;
      default:      return null;
    }
  }

  return (
    <section className="py-10 md:py-14 bg-white">
      <div className="max-w-7xl mx-auto px-5 md:px-6">

        {/* Section header */}
        <div className="text-center mb-10 md:mb-14">
          <h2
            className="vela-heading text-[22px] sm:text-[28px] md:text-[34px] text-[#111111] leading-tight"
            style={{ textWrap:"balance" } as React.CSSProperties}
          >
            Watch Vela handle a booking{" "}
            <span className="vela-gradient-text">from first message to confirmed</span>
          </h2>
          <p className="text-[#6B7280] text-base md:text-lg mt-4 max-w-lg mx-auto leading-relaxed">
            Six core screens. One platform. Click any card to explore or let the tour run.
          </p>
        </div>

        {/* Two-column: cards left, demo right */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-start">

          {/* Feature cards (shown below on mobile, left on desktop) */}
          <div className="order-last lg:order-first flex flex-col gap-3 lg:pt-2">
            {FEATURE_CARDS.map(f => {
              const active = scene === f.sceneIdx;
              return (
                <button
                  key={f.title}
                  onClick={() => goToScene(f.sceneIdx)}
                  className="flex items-start gap-4 p-4 rounded-2xl text-left transition-all duration-200 w-full"
                  style={{
                    background:   active ? "var(--vt-color)" : "#FAFAFA",
                    border:       active ? "1.5px solid var(--vp-color)" : "1.5px solid #F1F5F9",
                    boxShadow:    active ? "0 4px 16px var(--vp-10)" : "none",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-200"
                    style={{
                      background: active ? "var(--vp-10)" : "#F1F5F9",
                      color:      active ? "var(--vp-color)" : "#6B7280",
                      border:     active ? "1px solid var(--vp-15)" : "1px solid transparent",
                    }}
                  >{f.icon}</div>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-[#111111] leading-tight">{f.title}</p>
                    <p className="text-[13px] text-[#6B7280] mt-1 leading-relaxed">{f.desc}</p>
                  </div>
                  {active && (
                    <div className="shrink-0 mt-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background:"var(--vp-color)" }} />
                    </div>
                  )}
                </button>
              );
            })}

            {/* Channel badges */}
            <div className="flex flex-wrap gap-2 items-center mt-1 px-1">
              <span className="text-xs text-[#9CA3AF] font-medium mr-1">Works on:</span>
              {[
                { label:"Instagram DMs", color:"#E1306C" },
                { label:"WhatsApp",      color:"#25D366" },
                { label:"Website chat",  color:"#ed5426" },
                { label:"Phone calls",   color:"#6B7280" },
              ].map(ch=>(
                <span key={ch.label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-[#E5E7EB] text-[#374151]">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:ch.color }}/>
                  {ch.label}
                </span>
              ))}
            </div>
          </div>

          {/* Demo window */}
          <div className="order-first lg:order-last">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border:"1.5px solid #E5E7EB",
                boxShadow:"0 16px 56px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              {/* Window chrome */}
              <div className="h-9 flex items-center justify-between px-4 border-b border-[#F1F5F9] shrink-0" style={{ background:"#FAFAFA" }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#F87171]"/>
                  <div className="w-3 h-3 rounded-full bg-[#FBBF24]"/>
                  <div className="w-3 h-3 rounded-full bg-[#34D399]"/>
                </div>
                <span className="text-[11px] font-medium text-[#9CA3AF]">Ahmed Dental Clinic</span>
                <div style={{ width:52 }}/>
              </div>

              {/* Scene area with 3D perspective */}
              <div
                className="relative"
                style={{ height:480, perspective:1200, perspectiveOrigin:"50% 50%", overflow:"hidden" }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={scene}
                    variants={sceneVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="absolute inset-0"
                    style={{ backfaceVisibility:"hidden" }}
                  >
                    {renderScene(scene)}
                  </motion.div>
                </AnimatePresence>

                {/* Scene progress dots */}
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 pointer-events-none">
                  {Array.from({ length:SCENE_COUNT }).map((_,i)=>(
                    <div
                      key={i}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width:  i===scene ? 16 : 6,
                        height: 6,
                        background: i===scene ? "var(--vp-color)" : "rgba(0,0,0,0.18)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
