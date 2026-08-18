"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Scene indices ─────────────────────────────────────────── */
const CONV = 0, APPT = 1, CHAN = 2, AGENT = 3, ANALY = 4;
const SCENE_COUNT = 5;

/* ─── Auto-advance: duration set per scene so each choreography has room to finish ─── */
const SCENE_DURATIONS: number[] = [11800, 9400, 8900, 9200, 4800];
/* index matches CONV, APPT, CHAN, AGENT, ANALY */

/* ─── Appointments data ─────────────────────────────────────── */
type ApptRow = {
  i: string; name: string;
  service: string; time: string;
  ch: "WA" | "IG" | "WEB"; status: "Confirmed" | "Pending" | "Cancelled";
};
const APPTS: ApptRow[] = [
  { i:"SK", name:"Sara Khalid",     service:"Dental Cleaning",  time:"09:00", ch:"WA",  status:"Confirmed" },
  { i:"RM", name:"Rania Mahmoud",   service:"Teeth Whitening",  time:"09:45", ch:"IG",  status:"Confirmed" },
  { i:"MH", name:"Mohammed Hassan", service:"Teeth Whitening",  time:"10:30", ch:"IG",  status:"Confirmed" },
  { i:"LM", name:"Layla Mansouri",  service:"Dental Cleaning",  time:"11:00", ch:"WA",  status:"Confirmed" },
  { i:"KI", name:"Khaled Ibrahim",  service:"Cavity Filling",   time:"12:00", ch:"WEB", status:"Pending"   },
  { i:"FN", name:"Fatima Nasser",   service:"Root Canal",       time:"13:30", ch:"IG",  status:"Cancelled" },
];

/* ─── Recent calls ──────────────────────────────────────────── */
type CallRow = { i: string; name: string; status:"Booked"|"Transferred"|"Resolved"; summary:string; dur:string; time:string };
const CALLS: CallRow[] = [
  { i:"SK", name:"Sara Khalid",     status:"Booked",      dur:"2:14", time:"09:41", summary:"Caller booked a dental cleaning for Tuesday at 11:00 AM. Confirmed name and contact details." },
  { i:"MH", name:"Mohammed Hassan", status:"Transferred", dur:"1:47", time:"09:35", summary:"Caller asked about whitening prices and payment plan options. Transferred to billing team." },
  { i:"LM", name:"Layla Mansouri",  status:"Booked",      dur:"3:22", time:"09:20", summary:"Caller booked a cleaning and asked about parking and procedure comfort." },
];

/* ─── Recent calls: full transcript for the clickable Sara Khalid row ── */
const SARA_TRANSCRIPT: { who:"ai"|"caller"; text:string }[] = [
  { who:"ai",     text:"Thank you for calling Ahmed Dental Clinic. How can I help today?" },
  { who:"caller", text:"Hi, I'd like to book a cleaning appointment." },
  { who:"ai",     text:"Sure. Can I get your full name, please?" },
  { who:"caller", text:"Sara Khalid." },
  { who:"ai",     text:"Thanks, Sara. What day works best for you?" },
  { who:"caller", text:"Do you have anything on Tuesday?" },
  { who:"ai",     text:"Yes, Tuesday at 11:00 AM is open. Does that work?" },
  { who:"caller", text:"That works great." },
  { who:"ai",     text:"Perfect. Is this the best number to reach you?" },
  { who:"caller", text:"Yes, it is." },
  { who:"ai",     text:"You're booked: cleaning on Tuesday at 11:00 AM. A confirmation text is on its way." },
  { who:"caller", text:"Great, thank you!" },
];

/* ─── Bar chart ──────────────────────────────────────────────── */
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

/* Small illustrated circular avatar for the Conversation scene's customer
   side, in place of a text-initials badge. Inline SVG (not a photo asset)
   so the scene stays 100% self-contained -- no external image URL, no
   network dependency, no real person's likeness used without rights. */
function CustomerAvatar({ sz=28 }: { sz?:number }) {
  return (
    <div className="rounded-full overflow-hidden shrink-0" style={{ width:sz, height:sz }}>
      <svg width={sz} height={sz} viewBox="0 0 28 28" style={{ display:"block" }}>
        <rect width="28" height="28" fill="#FDE7D3"/>
        <ellipse cx="14" cy="10" rx="7.5" ry="8" fill="#4A2E1E"/>
        <circle cx="14" cy="12.5" r="5.2" fill="#F0BA92"/>
        <ellipse cx="14" cy="30" rx="10" ry="8" fill="#D96C8C"/>
      </svg>
    </div>
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
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:m.dot }} />{s}
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

/* ─── Conversation scene: a static-framed chat feed, no camera movement.
   Every message (both AI and customer) gets a brief three-dot typing/sending
   indicator before it lands, so the thread reads as a live back-and-forth
   rather than a stagger reveal. Messages (and the indicator itself) mount
   progressively rather than being pre-rendered opacity-hidden -- if every
   bubble occupied layout space from mount, the bottom-anchored flex column
   would anchor against the full message stack immediately, pushing
   already-revealed early bubbles off-screen behind still-invisible later
   ones. Mounting only what has actually arrived keeps justify-end doing
   real, correct auto-scroll: newest revealed bubble always stays in view.
   The booking confirmation is just the AI's last message in the thread,
   not a separate card. */
const CONV_MSGS = [
  { role:"user" as const, text:"Hi! I'd like to book a dental cleaning, please" },
  { role:"ai"   as const, text:"Of course! Could I get your name?" },
  { role:"user" as const, text:"Sara Khalid" },
  { role:"ai"   as const, text:"Thanks, Sara! What's the best number to reach you?" },
  { role:"user" as const, text:"055 123 4567" },
  { role:"ai"   as const, text:"Got it. What day and time work best for you?" },
  { role:"user" as const, text:"Is 2 PM next Tuesday free?" },
  { role:"ai"   as const, text:"Let me check..." },
  { role:"ai"   as const, text:"Yes, 2 PM Tuesday works!" },
  { role:"ai"   as const, text:"You're all set! See you Tuesday." },
];
/* Typing indicator start and bubble reveal time per message, ms from scene mount. */
const CONV_TYPING_AT = [300, 1200, 2250, 3150, 4200, 5100, 6150, 7050, 8150, 9200];
const CONV_REVEAL_AT = [950, 2000, 2900, 3950, 4850, 5900, 6800, 7850, 8950, 10000];

function AiAvatar() {
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5" style={{ background:"var(--vela-gradient)" }}>V</div>
  );
}

/* Three-dot typing/sending indicator, shaped like the sender's own bubble. */
function TypingIndicator({ role }: { role:"ai"|"user" }) {
  return (
    <motion.div
      initial={{ opacity:0, y:8 }}
      animate={{ opacity:1, y:0 }}
      transition={{ duration:0.25, ease:[0.22,1,0.36,1] }}
      className={`flex items-start gap-2 ${role==="user"?"justify-end":"justify-start"}`}
    >
      {role==="ai" && <AiAvatar />}
      <div className="px-3.5 py-3 rounded-2xl flex items-center gap-1"
        style={role==="user"
          ? { background:"var(--vela-gradient)", borderBottomRightRadius:4 }
          : { background:"white", border:"1px solid #E5E7EB", borderBottomLeftRadius:4 }}
      >
        {[0,1,2].map(i=>(
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: role==="user" ? "rgba(255,255,255,0.85)" : "#9CA3AF" }}
            animate={{ y:[0,-4,0] }}
            transition={{ duration:0.9, repeat:Infinity, delay:i*0.15, ease:"easeInOut" }}
          />
        ))}
      </div>
      {role==="user" && <div className="mt-0.5 shrink-0"><CustomerAvatar sz={28} /></div>}
    </motion.div>
  );
}

function SceneConversation() {
  const [revealed, setRevealed] = useState(0);
  const [typingRole, setTypingRole] = useState<"ai"|"user"|null>(null);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    CONV_MSGS.forEach((msg, idx) => {
      timers.push(setTimeout(() => setTypingRole(msg.role), CONV_TYPING_AT[idx]));
      timers.push(setTimeout(() => { setTypingRole(null); setRevealed(idx+1); }, CONV_REVEAL_AT[idx]));
    });
    return () => timers.forEach(clearTimeout);
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
          {["IG","WA","Web"].map(l=>(
            <span key={l} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#6B7280] font-semibold border border-[#E5E7EB]">{l}</span>
          ))}
        </div>
      </div>

      {/* Messages: dense, no dead space -- tight vertical gap, larger bubble
          text/padding than a sparse layout, bottom-anchored (see note above). */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end gap-1 px-4 py-3" style={{ background:"#F8FAFC" }}>
        {CONV_MSGS.slice(0, revealed).map((msg, idx)=>(
          <motion.div
            key={idx}
            initial={{ opacity:0, y:8 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.3, ease:[0.22,1,0.36,1] }}
            className={`flex items-start gap-2 ${msg.role==="user"?"justify-end":"justify-start"}`}
          >
            {msg.role==="ai" && <AiAvatar />}
            <div className="max-w-[72%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-snug"
              style={msg.role==="user"
                ? { background:"var(--vela-gradient)", color:"white", borderBottomRightRadius:4 }
                : { background:"white", color:"#374151", border:"1px solid #E5E7EB", borderBottomLeftRadius:4 }}
            >{msg.text}</div>
            {msg.role==="user" && (
              <div className="mt-0.5 shrink-0"><CustomerAvatar sz={28} /></div>
            )}
          </motion.div>
        ))}
        {typingRole && <TypingIndicator role={typingRole} />}
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

/* ─── Small pointer icon used by the click choreography scenes ─── */
function CursorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2.5 1.5L13.5 8L8.2 9L6 14L2.5 1.5Z" fill="#111111" stroke="white" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Appointments scene: step machine driving the full click-through ─── */
const APPT_STEP = {
  PAUSE: 0,
  ZOOM_IN: 1,
  CURSOR_TO_MENU: 2,
  CLICK_MENU: 3,
  MENU_OPEN: 4,
  CURSOR_TO_RESCHEDULE: 5,
  CLICK_RESCHEDULE: 6,
  TIME_UPDATE: 7,
  CONFIRMED: 8,
  ZOOM_OUT: 9,
} as const;

/* Percentage position of an element's center relative to a stage box, measured
   from the real rendered layout (getBoundingClientRect is scale-invariant as a
   ratio, so this stays correct whether measured before or during the zoom). */
function pctPosition(el: HTMLElement, stage: HTMLElement) {
  const s = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const top = ((r.top + r.height/2 - s.top) / s.height) * 100;
  const left = ((r.left + r.width/2 - s.left) / s.width) * 100;
  return { top:`${top}%`, left:`${left}%` };
}

/* ═══════════════════════════════════════════════════════════════
   Scene 1. Appointments
   No overflow-x-auto: table-fixed + overflow:hidden
   Choreography (numbered to match the spec):
   1 pause on the full table
   2 zoom into the Pending row
   3 cursor moves to that row's 3-dot menu icon
   4 click ripple lands exactly on the icon
   5 quick actions popup reveals (Reschedule / Message / Cancel)
   6 cursor moves again and clicks Reschedule
   7 popup morphs into a reschedule view, time/date updates with a flash
   8 the popup shows a single Appointment updated confirmation with a checkmark
   9 zoom back out to the full table, now showing the new time
═══════════════════════════════════════════════════════════════ */
function SceneAppointments() {
  const targetIdx = 4; // Khaled Ibrahim, Cavity Filling, starts Pending
  const [step, setStep] = useState<number>(APPT_STEP.PAUSE);

  const stageRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const rescheduleBtnRef = useRef<HTMLButtonElement>(null);
  const [iconPos, setIconPos] = useState({ top:"73%", left:"88%" });
  const [reschedulePos, setReschedulePos] = useState({ top:"58%", left:"46%" });

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (s: number, delay: number) => { timers.push(setTimeout(() => setStep(s), delay)); };
    // Measurements are scheduled after the relevant ancestor's own entrance
    // transition has settled (the outer scene fade/scale for the icon, the
    // popup's own scale-in for the Reschedule button). Measuring mid-transition
    // captures a not-yet-final getBoundingClientRect and produces a real offset,
    // not just a rounding error, so both are deferred well past their settle time
    // and well before the cursor actually needs to move toward them.
    timers.push(setTimeout(() => {
      if (iconRef.current && stageRef.current) {
        setIconPos(pctPosition(iconRef.current, stageRef.current));
      }
    }, 550));
    timers.push(setTimeout(() => {
      if (rescheduleBtnRef.current && stageRef.current) {
        setReschedulePos(pctPosition(rescheduleBtnRef.current, stageRef.current));
      }
    }, 3300));
    at(APPT_STEP.ZOOM_IN, 800);
    at(APPT_STEP.CURSOR_TO_MENU, 1700);
    at(APPT_STEP.CLICK_MENU, 2500);
    at(APPT_STEP.MENU_OPEN, 2650);
    at(APPT_STEP.CURSOR_TO_RESCHEDULE, 4100);
    at(APPT_STEP.CLICK_RESCHEDULE, 4700);
    at(APPT_STEP.TIME_UPDATE, 5600);
    at(APPT_STEP.CONFIRMED, 6500);
    at(APPT_STEP.ZOOM_OUT, 7500);
    return () => timers.forEach(clearTimeout);
  }, []);

  const zoomed = step >= APPT_STEP.ZOOM_IN && step < APPT_STEP.ZOOM_OUT;
  const rescheduled = step >= APPT_STEP.TIME_UPDATE;

  const cursor =
    step < APPT_STEP.CURSOR_TO_MENU ? { opacity:0, top:"15%", left:"48%" } :
    step <= APPT_STEP.MENU_OPEN ? { opacity:1, ...iconPos } :
    step === APPT_STEP.CURSOR_TO_RESCHEDULE || step === APPT_STEP.CLICK_RESCHEDULE ? { opacity:1, ...reschedulePos } :
    { opacity:0, ...reschedulePos };

  const panelView =
    step === APPT_STEP.MENU_OPEN || step === APPT_STEP.CURSOR_TO_RESCHEDULE ? "menu" :
    step === APPT_STEP.CLICK_RESCHEDULE || step === APPT_STEP.TIME_UPDATE ? "reschedule" :
    step === APPT_STEP.CONFIRMED ? "confirmed" : "hidden";

  const rowBg =
    step === APPT_STEP.TIME_UPDATE ? "rgba(237,84,38,0.16)" :
    zoomed ? "rgba(237,84,38,0.06)" : "rgba(237,84,38,0)";

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

      {/* Table stage: overflow:hidden. The zoom wrapper hosts the table plus the whole
          click-through overlay so the cursor, ripples, and popup all zoom in sync with it. */}
      <div className="flex-1 overflow-hidden px-4">
        <motion.div
          ref={stageRef}
          className="relative h-full"
          style={{ transformOrigin:`${iconPos.left} ${iconPos.top}` }}
          animate={{ scale: zoomed ? 1.3 : 1 }}
          transition={{ duration:0.8, ease:"easeInOut" }}
        >
          <table style={{ tableLayout:"fixed", width:"100%", borderCollapse:"collapse" }}>
            <colgroup>
              <col style={{ width:"28%" }} />
              <col style={{ width:"26%" }} />
              <col style={{ width:"13%" }} />
              <col style={{ width:"13%" }} />
              <col style={{ width:"20%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-[#F3F4F6]">
                {["NAME","SERVICE","TIME","CH","STATUS"].map(h=>(
                  <th key={h} className="text-left text-[9px] font-semibold text-[#9CA3AF] px-2 py-2 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {APPTS.map((row, rowIdx)=>{
                const isTarget = rowIdx===targetIdx;
                const displayTime = isTarget && rescheduled ? "3:00 PM" : row.time;
                const displayDate = isTarget && rescheduled ? "Jul 22" : "Jul 21";
                const displayStatus: ApptRow["status"] = isTarget && rescheduled ? "Confirmed" : row.status;
                return (
                  <motion.tr
                    key={row.name}
                    className="border-b border-[#F9FAFB]"
                    animate={isTarget ? { backgroundColor: rowBg } : undefined}
                    transition={isTarget ? { duration:0.5, ease:"easeInOut" } : undefined}
                  >
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Av i={row.i} sz={22} />
                        <span className="text-[10px] font-semibold text-[#111111] truncate">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="text-[10px] text-[#374151] truncate block">{row.service}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <p className="text-[10px] font-bold text-[#111111]">{displayTime}</p>
                      <p className="text-[9px] text-[#9CA3AF]">{displayDate}</p>
                    </td>
                    <td className="px-2 py-1.5"><ChBadge ch={row.ch} /></td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <StatusPill s={displayStatus} />
                        {isTarget && (
                          <div
                            ref={iconRef}
                            className="rounded-full flex items-center justify-center shrink-0"
                            style={{ width:14, height:14, background:"white", border:"1px solid #E5E7EB" }}
                          >
                            <svg width="8" height="8" viewBox="0 0 9 9" fill="none">
                              <circle cx="1.3" cy="4.5" r="1.1" fill="#6B7280"/><circle cx="4.5" cy="4.5" r="1.1" fill="#6B7280"/><circle cx="7.7" cy="4.5" r="1.1" fill="#6B7280"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>

          {/* Simulated cursor. CursorIcon's pointer tip sits at (2.5,1.5) in its
              own 16x16 box, not the box center, so the anchor offset must
              shift by that exact amount for the tip (not the icon's middle)
              to land on the target coordinate. z-50 keeps it strictly above
              the table, the ripples, and the popup (all z-30 or lower) for
              its entire travel path, so it never passes behind anything on
              its way from the 3-dot icon to the Reschedule button. */}
          <motion.div
            className="absolute pointer-events-none z-50"
            style={{ transform:"translate(-2.5px, -1.5px)" }}
            animate={cursor}
            transition={{ duration:0.7, ease:"easeInOut" }}
          >
            <CursorIcon />
          </motion.div>

          {/* Click ripple: 3-dot icon */}
          <AnimatePresence>
            {(step===APPT_STEP.CLICK_MENU || step===APPT_STEP.MENU_OPEN) && (
              <motion.div
                key="ripple-menu"
                className="absolute rounded-full pointer-events-none z-20"
                style={{ top:iconPos.top, left:iconPos.left, width:18, height:18, marginLeft:-9, marginTop:-9, border:"2px solid #ed5426" }}
                initial={{ scale:0.4, opacity:0 }}
                animate={{ scale:[0.4, 0.6, 2], opacity:[0, 0.7, 0] }}
                transition={{ duration:0.6, times:[0, 0.15, 1], ease:"easeOut" }}
              />
            )}
          </AnimatePresence>

          {/* Click ripple: Reschedule button */}
          <AnimatePresence>
            {(step===APPT_STEP.CLICK_RESCHEDULE || step===APPT_STEP.TIME_UPDATE) && (
              <motion.div
                key="ripple-reschedule"
                className="absolute rounded-full pointer-events-none z-20"
                style={{ top:reschedulePos.top, left:reschedulePos.left, width:18, height:18, marginLeft:-9, marginTop:-9, border:"2px solid #ed5426" }}
                initial={{ scale:0.4, opacity:0 }}
                animate={{ scale:[0.4, 0.6, 2], opacity:[0, 0.7, 0] }}
                transition={{ duration:0.6, times:[0, 0.15, 1], ease:"easeOut" }}
              />
            )}
          </AnimatePresence>

          {/* Quick actions / reschedule / confirmed popup.
              Anchored to the measured icon position and opened upward-left via
              a transform on a plain wrapper div (see note above -- the inner
              motion.div owns the scale/opacity entrance animation instead, so
              the two transforms never fight). Always fully inside the frame.
              The confirmed view gets a touch more width so the single closing
              message has real breathing room instead of competing with a
              second floating badge for the same small space. */}
          <div className="absolute z-30" style={{ top:iconPos.top, left:iconPos.left, width:panelView==="confirmed"?132:100, transform:"translate(-88%, calc(-100% - 8px))" }}>
            <AnimatePresence>
              {panelView !== "hidden" && (
              <motion.div
                key="appt-panel"
                className="bg-white rounded-xl border border-[#E5E7EB] shadow-lg px-2 py-1.5"
                initial={{ opacity:0, scale:0.85 }}
                animate={{ opacity:1, scale:1 }}
                exit={{ opacity:0, scale:0.9 }}
                transition={{ duration:0.3, ease:[0.22,1,0.36,1] }}
              >
                <AnimatePresence mode="wait">
                  {panelView === "menu" && (
                    <motion.div key="view-menu" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}} className="flex flex-col gap-0.5">
                      <p className="text-[8px] font-semibold text-[#9CA3AF] px-0.5 mb-0.5">Quick actions</p>
                      <button ref={rescheduleBtnRef} className="text-[9px] font-bold text-white rounded-lg px-1.5 py-1 leading-none" style={{ background:"var(--vela-gradient)" }}>Reschedule</button>
                      <button className="text-[9px] font-medium text-[#374151] rounded-lg px-1.5 py-1 leading-none border border-[#E5E7EB]">Message</button>
                      <button className="text-[9px] font-medium text-[#DC2626] rounded-lg px-1.5 py-1 leading-none border border-[#FECACA]">Cancel</button>
                    </motion.div>
                  )}
                  {panelView === "reschedule" && (
                    <motion.div key="view-reschedule" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}} className="flex flex-col gap-1">
                      <p className="text-[8px] font-semibold text-[#9CA3AF] px-0.5 truncate">Cavity Filling</p>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={rescheduled ? "new" : "old"}
                          initial={{ opacity:0, y:-4 }}
                          animate={{ opacity:1, y:0 }}
                          exit={{ opacity:0, y:4 }}
                          transition={{ duration:0.35 }}
                          className="rounded-lg px-1.5 py-1"
                          style={{ background: rescheduled ? "rgba(34,197,94,0.12)" : "rgba(156,163,175,0.12)" }}
                        >
                          <p className="text-[10px] font-bold leading-tight" style={{ color: rescheduled ? "#16A34A" : "#374151" }}>{rescheduled ? "3:00 PM" : "12:00"}</p>
                          <p className="text-[8px] text-[#9CA3AF] leading-tight">{rescheduled ? "Jul 22" : "Jul 21"}</p>
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>
                  )}
                  {panelView === "confirmed" && (
                    <motion.div key="view-confirmed" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}} className="flex items-center gap-2 py-1">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1.5 5.5l2 2 5-4.5" stroke="#16A34A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <p className="text-[9px] font-bold text-[#16A34A] leading-snug">Appointment updated</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


/* ─── Channels scene: step machine driving a simulated connect flow ─── */
const CHAN_STEP = {
  PAUSE: 0,
  ZOOM: 1,
  CURSOR_TO_CONNECT: 2,
  CLICK_CONNECT: 3,
  FLOW_NUMBER: 4,
  FLOW_AUTHORIZE: 5,
  FLOW_CONNECTED: 6,
  CARD_CONNECTED: 7,
  SETTLE: 8,
} as const;

const WHATSAPP_NUMBER = "+971 4 123 4567";

function parseStatValue(v: string): number {
  return parseFloat(v.replace(/,/g, "").replace("%",""));
}
function makeStatFormatter(v: string): (n:number)=>string {
  return v.includes("%") ? (n)=> n.toFixed(1) + "%" : (n)=> Math.round(n).toLocaleString();
}

/* One-shot count-up from 0 to target, replayed every time the owning scene
   remounts (the outer AnimatePresence keys each scene by index, so a fresh
   mount happens every loop -- same replay mechanism Appointments/Channels/
   Conversation already rely on for their own timers). Optional delay lets
   callers stagger several stat cards without needing separate state. */
function CountUp({ target, format, duration=1200, delay=0 }: { target:number; format:(n:number)=>string; duration?:number; delay?:number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const startTimer = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const t = Math.min(1, (now-start)/duration);
        const eased = 1 - Math.pow(1-t, 3);
        setVal(target*eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { cancelled = true; clearTimeout(startTimer); cancelAnimationFrame(raf); };
  }, [target, duration, delay]);
  return <>{format(val)}</>;
}

/* ═══════════════════════════════════════════════════════════════
   Scene 3. Channels
   overflow:hidden. 3 cards fit comfortably
   Choreography (numbered to match the spec):
   1 pause: Instagram and Website Chat connected, WhatsApp Business not connected
   2 zoom/highlight on the WhatsApp Business card
   3 cursor clicks its Connect button
   4 illustrative connect flow: Enter number -> Authorize -> Connected!
   5 card flips to Connected, stats count up from 0
   6 brief pause on the now-all-connected state before the scene ends
═══════════════════════════════════════════════════════════════ */
function SceneChannels() {
  const targetIdx = 1; // WhatsApp Business, starts Not connected
  const [step, setStep] = useState<number>(CHAN_STEP.PAUSE);

  const connectStageRef = useRef<HTMLDivElement>(null);
  const connectBtnRef = useRef<HTMLButtonElement>(null);
  const [connectPos, setConnectPos] = useState({ top:"50%", left:"85%" });
  const [phoneReveal, setPhoneReveal] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (s: number, delay: number) => { timers.push(setTimeout(() => setStep(s), delay)); };
    // Measure the real Connect button position after the outer scene entrance
    // transition has settled, so the cursor and ripple are mathematically tied
    // to its actual rendered position instead of a hardcoded approximation.
    // Measuring immediately on mount would capture a mid-transition rect.
    timers.push(setTimeout(() => {
      if (connectBtnRef.current && connectStageRef.current) {
        setConnectPos(pctPosition(connectBtnRef.current, connectStageRef.current));
      }
    }, 550));
    at(CHAN_STEP.ZOOM, 700);
    at(CHAN_STEP.CURSOR_TO_CONNECT, 1600);
    at(CHAN_STEP.CLICK_CONNECT, 2300);
    at(CHAN_STEP.FLOW_NUMBER, 2450);
    at(CHAN_STEP.FLOW_AUTHORIZE, 3950);
    at(CHAN_STEP.FLOW_CONNECTED, 4850);
    at(CHAN_STEP.CARD_CONNECTED, 5650);
    at(CHAN_STEP.SETTLE, 7650);
    return () => timers.forEach(clearTimeout);
  }, []);

  // Types the WhatsApp number in one character at a time while the Enter
  // number step is active, so it reads as a real number being entered.
  useEffect(() => {
    if (step !== CHAN_STEP.FLOW_NUMBER) {
      if (step < CHAN_STEP.FLOW_NUMBER) setPhoneReveal(0);
      return;
    }
    setPhoneReveal(0);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setPhoneReveal(i);
      if (i >= WHATSAPP_NUMBER.length) clearInterval(id);
    }, 85);
    return () => clearInterval(id);
  }, [step]);

  const allConnected = step >= CHAN_STEP.CARD_CONNECTED;

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
      // FIX: was a generic filled inbox-envelope shape, not the same glyph
      // used everywhere else (dashboard Channels page, /demo/channels) --
      // swapped to the exact same outlined chat-bubble path for consistency.
      icon:<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="18" height="18"><path d="M21 10.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
      name:"Website Chat", handle:"ahmeddentalclinic.ae",
      stats:[{val:"1,240",label:"Website visitors"},{val:"8.3%",label:"Chat conversions"}],
    },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background:"linear-gradient(135deg,white 62%,rgba(237,84,38,0.07) 100%)" }}>
      <SceneHdr title="Channels" sub="Connected messaging channels" btn="+ Connect" />

      <div className="mx-4 mb-2 px-3 py-2 rounded-xl flex items-center gap-2 shrink-0" style={{ background: allConnected?"#F0FDF4":"#FFFBEB", border: allConnected?"1px solid #BBF7D0":"1px solid #FDE68A" }}>
        {allConnected ? (
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 6.5l3 3 7-6" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="#D97706" strokeWidth="1.4"/><path d="M6.5 4v3.2M6.5 9h.01" stroke="#D97706" strokeWidth="1.4" strokeLinecap="round"/></svg>
        )}
        <span className="text-[10px] font-medium" style={{ color: allConnected?"#15803D":"#B45309" }}>
          {allConnected
            ? "All 3 channels connected. Your AI agent is live across Instagram, WhatsApp, and your website."
            : "2 of 3 channels connected. Connect WhatsApp Business to go fully live."}
        </span>
      </div>

      {/* overflow:hidden — 3 cards fit without scrolling */}
      <div className="flex-1 overflow-hidden px-4 flex flex-col gap-2 pb-3">
        {channels.map((ch, chIdx)=>{
          const isTarget = chIdx===targetIdx;
          const zoomed = isTarget && step >= CHAN_STEP.ZOOM && step < CHAN_STEP.SETTLE;
          const dimmed = !isTarget && step >= CHAN_STEP.ZOOM && step < CHAN_STEP.SETTLE;
          const connected = !isTarget || step >= CHAN_STEP.CARD_CONNECTED;
          const showFlow = isTarget && (step===CHAN_STEP.CLICK_CONNECT || step===CHAN_STEP.FLOW_NUMBER || step===CHAN_STEP.FLOW_AUTHORIZE || step===CHAN_STEP.FLOW_CONNECTED);
          const showCursor = isTarget && (step===CHAN_STEP.CURSOR_TO_CONNECT || step===CHAN_STEP.CLICK_CONNECT);
          const showRipple = isTarget && (step===CHAN_STEP.CLICK_CONNECT || step===CHAN_STEP.FLOW_NUMBER);

          return (
            <motion.div
              key={ch.name}
              className="bg-white border border-[#E5E7EB] rounded-xl p-3 relative overflow-hidden"
              style={{ transformOrigin:"center", zIndex:isTarget?10:1 }}
              animate={
                zoomed ? { scale:1.07, opacity:1, boxShadow:"0 8px 24px rgba(237,84,38,0.18)" } :
                dimmed ? { scale:1, opacity:0.45, boxShadow:"0 0px 0px rgba(0,0,0,0)" } :
                { scale:1, opacity:1, boxShadow:"0 0px 0px rgba(0,0,0,0)" }
              }
              transition={{ duration:0.6, ease:"easeInOut" }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:ch.iconBg }}>{ch.icon}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13px] font-bold text-[#111111]">{ch.name}</span>
                      {connected
                        ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background:"#F0FDF4", color:"#16A34A" }}>Connected</span>
                        : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background:"#F3F4F6", color:"#6B7280" }}>Not connected</span>}
                    </div>
                    {/* While the target card is not yet connected, its real number has not
                        been entered yet -- showing it here would leak the connect flow's
                        own reveal. It only appears once actually connected. */}
                    <p className="text-[10px] text-[#9CA3AF] truncate">{isTarget && !connected ? "No number connected yet" : ch.handle}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 relative" ref={isTarget ? connectStageRef : undefined}>
                  {connected ? (
                    <>
                      <button className="text-[10px] font-medium px-2 py-1 rounded-lg border border-[#E5E7EB] text-[#374151]">Manage</button>
                      <button className="text-[10px] font-medium px-2 py-1 rounded-lg border border-[#FECACA] text-[#DC2626]">Disconnect</button>
                    </>
                  ) : (
                    <button ref={isTarget ? connectBtnRef : undefined} className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-white" style={{ background:"var(--vela-gradient)" }}>Connect</button>
                  )}

                  {isTarget && (
                    <>
                      {/* CursorIcon's pointer tip sits at (2.5,1.5) in its own
                          16x16 box, not the box center, so the anchor offset
                          shifts by that exact amount for the tip to land on
                          the measured Connect button position. The "off"
                          state uses a plain percentage, not calc(), since
                          Framer Motion does not cleanly tween a calc()
                          expression against a plain percentage target --
                          it was measured to drift after arriving, rather
                          than settle. */}
                      <motion.div
                        className="absolute pointer-events-none z-30"
                        style={{ transform:"translate(-2.5px, -1.5px)" }}
                        animate={{
                          opacity: showCursor?1:0,
                          top: connectPos.top,
                          left: showCursor ? connectPos.left : "95%",
                        }}
                        transition={{ duration:0.5, ease:"easeInOut" }}
                      >
                        <CursorIcon />
                      </motion.div>
                      <AnimatePresence>
                        {showRipple && (
                          <motion.div
                            key="chan-ripple"
                            className="absolute rounded-full pointer-events-none z-20"
                            style={{ top:connectPos.top, left:connectPos.left, width:20, height:20, marginLeft:-10, marginTop:-10, border:"2px solid #ed5426" }}
                            initial={{ scale:0.4, opacity:0 }}
                            animate={{ scale:[0.4, 0.6, 2.2], opacity:[0, 0.7, 0] }}
                            transition={{ duration:0.6, times:[0, 0.15, 1], ease:"easeOut" }}
                          />
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-6 mt-2 pl-[52px]">
                {ch.stats.map(({val,label})=>(
                  <div key={label}>
                    <p className="text-[13px] font-black text-[#111111] leading-none">
                      {isTarget
                        ? (step >= CHAN_STEP.CARD_CONNECTED
                            ? <CountUp target={parseStatValue(val)} format={makeStatFormatter(val)} />
                            : "--")
                        : val}
                    </p>
                    <p className="text-[10px] text-[#9CA3AF]">{label}</p>
                  </div>
                ))}
              </div>

              {/* Illustrative connect flow: Choose channel -> Authorize -> Connected! */}
              <AnimatePresence>
                {isTarget && showFlow && (
                  <motion.div
                    key="connect-flow"
                    className="absolute inset-0 z-20 flex items-center justify-center"
                    style={{ background:"rgba(255,255,255,0.97)" }}
                    initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.25 }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <AnimatePresence mode="wait">
                        {(step===CHAN_STEP.CLICK_CONNECT || step===CHAN_STEP.FLOW_NUMBER) && (
                          <motion.div key="f0" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:0.25}} className="flex flex-col items-center gap-1.5">
                            <div className="rounded-lg border border-[#E5E7EB] bg-white px-2 py-1 text-left whitespace-nowrap" style={{ width:104 }}>
                              <span className="text-[8px] font-mono font-semibold text-[#111111]">{WHATSAPP_NUMBER.slice(0, phoneReveal)}</span>
                              <span className="text-[8px] font-mono text-[#25D366]">|</span>
                            </div>
                            <p className="text-[10px] font-semibold text-[#374151]">Enter number</p>
                          </motion.div>
                        )}
                        {step===CHAN_STEP.FLOW_AUTHORIZE && (
                          <motion.div key="f1" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:0.25}} className="flex flex-col items-center gap-1.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background:"#FFF7ED" }}>
                              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="3" y="6" width="8" height="6" rx="1.3" stroke="#ed5426" strokeWidth="1.3"/><path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="#ed5426" strokeWidth="1.3"/></svg>
                            </div>
                            <p className="text-[10px] font-semibold text-[#374151]">Authorize</p>
                          </motion.div>
                        )}
                        {step===CHAN_STEP.FLOW_CONNECTED && (
                          <motion.div key="f2" initial={{opacity:0,scale:0.7}} animate={{opacity:1,scale:1}} exit={{opacity:0}} transition={{duration:0.3,ease:[0.34,1.56,0.64,1]}} className="flex flex-col items-center gap-1.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-green-100">
                              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5l3 3 6-6" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            <p className="text-[10px] font-bold text-[#16A34A]">Connected!</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {[0,1,2].map(i=>{
                          const activeIdx = step===CHAN_STEP.FLOW_AUTHORIZE ? 1 : step===CHAN_STEP.FLOW_CONNECTED ? 2 : 0;
                          return (
                            <span
                              key={i}
                              className="rounded-full"
                              style={{ width: activeIdx===i?14:6, height:6, background: i<=activeIdx?"#25D366":"#E5E7EB", transition:"width 0.25s, background 0.25s" }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* Shared count-up format helpers -- reused by AI Agent Overview and Analytics. */
function fmtInt(n: number): string { return Math.round(n).toLocaleString(); }
function fmtPctWhole(n: number): string { return Math.round(n) + "%"; }
function fmtDuration(n: number): string {
  const m = Math.floor(n/60), s = Math.round(n%60);
  return `${m}:${String(s).padStart(2,"0")}`;
}

/* Step machine for the Recent Calls click-through, appended after the
   stat/bar/donut/list reveal has settled (~3.1s in). Mirrors the cursor
   move -> click ripple -> panel pattern already established in
   SceneAppointments, but the "panel" here is a full-stage transcript
   view instead of a small popup. */
const AGENT_STEP = {
  REVEAL: 0,
  CURSOR_IN: 1,
  CURSOR_AT_ROW: 2,
  CLICKED: 3,
  TRANSCRIPT: 4,
  RETURNING: 5,
} as const;

/* ═══════════════════════════════════════════════════════════════
   Scene 4. AI Agent
   overflow:hidden. 3 call rows, content verified to fit 480 px
   All animated content replays on every loop, since the outer
   AnimatePresence keys each scene by index and remounts it fresh
   each time it comes back around (same mechanism the other scenes
   already rely on for their own timers).
   Choreography:
   1 stat cards count up, bars grow, donut fills, call rows reveal (~3.1s)
   2 cursor moves to the Sara Khalid row and clicks it
   3 that row zooms into a full call transcript view
   4 hold on the transcript, then transition back to the Recent Calls list
═══════════════════════════════════════════════════════════════ */
function SceneAgent() {
  const maxBar = Math.max(...BAR_VALS);
  const barH = 78, barW = 28, barGap = 36;
  const r = 34;

  const [step, setStep] = useState<number>(AGENT_STEP.REVEAL);
  const stageRef = useRef<HTMLDivElement>(null);
  const row0Ref = useRef<HTMLDivElement>(null);
  const [row0Pos, setRow0Pos] = useState({ top:"70%", left:"50%" });

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (s: number, delay: number) => { timers.push(setTimeout(() => setStep(s), delay)); };
    // Measured once the row's own entrance reveal has settled, so the cursor
    // and ripple are tied to its real rendered position (see pctPosition).
    timers.push(setTimeout(() => {
      if (row0Ref.current && stageRef.current) {
        setRow0Pos(pctPosition(row0Ref.current, stageRef.current));
      }
    }, 2800));
    at(AGENT_STEP.CURSOR_IN, 3500);
    at(AGENT_STEP.CURSOR_AT_ROW, 4250);
    at(AGENT_STEP.CLICKED, 4550);
    at(AGENT_STEP.TRANSCRIPT, 4900);
    at(AGENT_STEP.RETURNING, 8000);
    return () => timers.forEach(clearTimeout);
  }, []);

  const cursor =
    step < AGENT_STEP.CURSOR_IN   ? { opacity:0, top:"8%", left:"50%" } :
    step < AGENT_STEP.TRANSCRIPT  ? { opacity:1, ...row0Pos } :
    { opacity:0, ...row0Pos };

  const rowHighlighted = step === AGENT_STEP.CURSOR_AT_ROW || step === AGENT_STEP.CLICKED;
  const showTranscript = step === AGENT_STEP.TRANSCRIPT;

  return (
    <div ref={stageRef} className="relative flex flex-col h-full" style={{ background:"linear-gradient(135deg,white 62%,rgba(237,84,38,0.07) 100%)" }}>
      <SceneHdr title="AI Phone Agent" sub="Your 24/7 voice AI assistant" btn="Test Voice Agent" />

      {/* Stat cards -- each number counts up from 0, staggered ~180ms apart */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-2 shrink-0">
        {[
          { target:847,  format:fmtInt,       label:"Total Calls"    },
          { target:94,   format:fmtPctWhole,  label:"Resolved by AI" },
          { target:154,  format:fmtDuration,  label:"Avg Duration"   },
          { target:132,  format:fmtInt,       label:"This Week", sub:"+12%" },
        ].map(({target,format,label,sub}, i)=>(
          <div key={label} className="border border-[#E5E7EB] rounded-xl p-2 bg-white">
            <p className="text-base font-black text-[#111111] leading-none">
              <CountUp target={target} format={format} duration={1700} delay={i*180} />
            </p>
            <p className="text-[9px] text-[#9CA3AF] mt-0.5 leading-tight">{label}</p>
            {sub&&<p className="text-[9px] font-bold text-green-600 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="flex gap-2 px-4 mb-2 shrink-0">
        <div className="flex-1 bg-white border border-[#E5E7EB] rounded-xl p-2.5">
          <p className="text-[10px] font-semibold text-[#374151] mb-1.5">Calls This Week</p>
          <svg width="100%" height={barH+16} viewBox={`0 0 ${BAR_DAYS.length*barGap} ${barH+16}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="ptBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ed5426" /><stop offset="100%" stopColor="#f59e6b" />
              </linearGradient>
            </defs>
            {BAR_VALS.map((v,i)=>{
              const bh=(v/maxBar)*barH;
              return (
                <g key={i}>
                  <motion.rect
                    x={i*barGap+4} width={barW} rx={3} fill="url(#ptBarGrad)"
                    initial={{ height:0, y:barH }}
                    animate={{ height:bh, y:barH-bh }}
                    transition={{ duration:0.95, delay:0.3+i*0.11, ease:"easeOut" }}
                  />
                  <text x={i*barGap+4+barW/2} y={barH+13} textAnchor="middle" fontSize="8" fill="#9CA3AF">{BAR_DAYS[i]}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-2.5 flex flex-col items-center justify-center shrink-0" style={{ width:92 }}>
          <svg width="72" height="72" viewBox="0 0 84 84">
            <circle cx="42" cy="42" r={r} fill="none" stroke="#F3F4F6" strokeWidth="9"/>
            {/* pathLength drives Framer's own stroke-dasharray/dashoffset from the
                circle's real measured circumference, so it fills to exactly 0.94
                of the ring regardless of the r/circumference math. */}
            <motion.circle
              cx="42" cy="42" r={r} fill="none" stroke="#ed5426" strokeWidth="9"
              strokeLinecap="round" transform="rotate(-90 42 42)"
              initial={{ pathLength:0 }}
              animate={{ pathLength:0.94 }}
              transition={{ duration:1.8, delay:0.45, ease:"easeOut" }}
            />
            <text x="42" y="47" textAnchor="middle" fontSize="16" fontWeight="800" fill="#111111">
              <CountUp target={94} format={fmtPctWhole} duration={1800} delay={450} />
            </text>
          </svg>
          <p className="text-[9px] font-semibold text-[#374151] text-center leading-tight mt-0.5">AI Resolution</p>
          <p className="text-[8px] text-[#9CA3AF] text-center">6% escalated</p>
        </div>
      </div>

      {/* Recent calls — overflow:hidden, exactly 3 rows, light staggered reveal.
          Row 0 is clickable in spirit (simulated cursor drives the demo, not
          real pointer events) and gets a highlight tint + ref for the zoom. */}
      <div className="flex-1 overflow-hidden px-4 pb-2">
        <p className="text-[10px] font-bold text-[#374151] mb-1.5">Recent Calls</p>
        <div className="flex flex-col gap-1.5">
          {CALLS.map((call,ci)=>(
            <motion.div
              key={call.name}
              ref={ci===0 ? row0Ref : undefined}
              className="border border-[#E5E7EB] rounded-xl px-3 py-2"
              initial={{ opacity:0, y:8 }}
              animate={{
                opacity:1, y:0,
                backgroundColor: ci===0 && rowHighlighted ? "rgba(237,84,38,0.08)" : "#ffffff",
              }}
              transition={{
                opacity:{ duration:0.3, delay:2.0+ci*0.26, ease:[0.22,1,0.36,1] },
                y:{ duration:0.3, delay:2.0+ci*0.26, ease:[0.22,1,0.36,1] },
                backgroundColor:{ duration:0.3, ease:"easeInOut" },
              }}
            >
              <div className="flex items-start gap-2">
                <Av i={call.i} sz={24} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-semibold text-[#111111]">{call.name}</span>
                    <CallPill s={call.status} />
                  </div>
                  {ci===0&&<p className="text-[10px] text-[#9CA3AF] leading-tight line-clamp-2">{call.summary}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold text-[#374151]">{call.dur}</p>
                  <p className="text-[9px] text-[#9CA3AF]">{call.time}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Simulated cursor + click ripple, same technique as SceneAppointments. */}
      <motion.div
        className="absolute pointer-events-none z-50"
        style={{ transform:"translate(-2.5px, -1.5px)" }}
        animate={cursor}
        transition={{ duration:0.75, ease:"easeInOut" }}
      >
        <CursorIcon />
      </motion.div>
      <AnimatePresence>
        {step===AGENT_STEP.CLICKED && (
          <motion.div
            key="ripple-row0"
            className="absolute rounded-full pointer-events-none z-40"
            style={{ top:row0Pos.top, left:row0Pos.left, width:18, height:18, marginLeft:-9, marginTop:-9, border:"2px solid #ed5426" }}
            initial={{ scale:0.4, opacity:0 }}
            animate={{ scale:[0.4, 0.6, 2], opacity:[0, 0.7, 0] }}
            transition={{ duration:0.6, times:[0, 0.15, 1], ease:"easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* Full call transcript — zooms in from the clicked row's position,
          holds, then zooms back out to the Recent Calls list. */}
      <AnimatePresence>
        {showTranscript && (
          <motion.div
            key="transcript"
            className="absolute inset-0 z-30 bg-white flex flex-col"
            style={{ transformOrigin:`${row0Pos.left} ${row0Pos.top}` }}
            initial={{ opacity:0, scale:0.25 }}
            animate={{ opacity:1, scale:1 }}
            exit={{ opacity:0, scale:0.25 }}
            transition={{ duration:0.6, ease:[0.22,1,0.36,1] }}
          >
            <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#F3F4F6] shrink-0">
              <Av i={CALLS[0].i} sz={28} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold text-[#111111]">{CALLS[0].name}</span>
                  <CallPill s={CALLS[0].status} />
                </div>
                <p className="text-[9px] text-[#9CA3AF]">Call transcript - {CALLS[0].dur}</p>
              </div>
            </div>
            <div className="flex-1 overflow-hidden px-4 py-2.5 flex flex-col gap-1.5">
              {SARA_TRANSCRIPT.map((line, li)=>(
                <motion.div
                  key={li}
                  initial={{ opacity:0, y:6 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ duration:0.3, delay:0.15+li*0.14, ease:[0.22,1,0.36,1] }}
                  className="flex items-baseline gap-1.5"
                >
                  <span className="text-[9px] font-bold shrink-0" style={{ color: line.who==="ai" ? "#ed5426" : "#374151", width:34 }}>
                    {line.who==="ai" ? "AI:" : "Sara:"}
                  </span>
                  <span className="text-[10px] text-[#374151] leading-snug">{line.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Scene 5. Analytics
═══════════════════════════════════════════════════════════════ */
function SceneAnalytics() {
  const cW=400, cH=88;
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

      {/* Stat cards -- each number counts up from 0, staggered ~120ms apart */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-2 shrink-0">
        {[
          {label:"Total Leads",   target:167, format:fmtInt,      pct:"+23%"},
          {label:"Conversations", target:225, format:fmtInt,      pct:"+18%"},
          {label:"Appts Booked",  target:100, format:fmtInt,      pct:"+31%"},
          {label:"AI Resolution", target:94,  format:fmtPctWhole, pct:"+2%" },
        ].map(({label,target,format,pct}, i)=>(
          <div key={label} className="border border-[#E5E7EB] rounded-xl p-2 bg-white">
            <div className="flex items-start justify-between gap-1 mb-1">
              <span className="text-[9px] text-[#9CA3AF] font-medium leading-tight">{label}</span>
              <span className="text-[9px] font-bold text-green-600 shrink-0">{pct}</span>
            </div>
            <p className="text-base font-black text-[#111111] leading-none">
              <CountUp target={target} format={format} duration={1700} delay={i*180} />
            </p>
          </div>
        ))}
      </div>

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
        <svg width="100%" height={cH+18} viewBox={`0 0 ${cW} ${cH+18}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="ptLineArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(237,84,38,0.18)"/>
              <stop offset="100%" stopColor="rgba(237,84,38,0)"/>
            </linearGradient>
          </defs>
          <motion.path
            d={areaD} fill="url(#ptLineArea)"
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            transition={{ duration:0.5, delay:2.1 }}
          />
          {/* The line draws itself via pathLength (Framer manages the real
              stroke-dasharray/dashoffset off the path's actual measured
              length), not a fade -- reads as the line being traced live. */}
          <motion.path
            d={pathD} fill="none" stroke="#ed5426" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength:0 }}
            animate={{ pathLength:1 }}
            transition={{ duration:1.9, delay:0.4, ease:"easeInOut" }}
          />
          <motion.circle
            cx={cW} cy={lastY} r="3.5" fill="#ed5426"
            initial={{ scale:0, opacity:0 }}
            animate={{ scale:1, opacity:1 }}
            transition={{ duration:0.3, delay:2.3, ease:[0.34,1.56,0.64,1] }}
          />
          {["/21","6/26","7/1","7/6","7/11","7/16","7/20"].map((lbl,i)=>(
            <text key={i} x={(i/6)*cW} y={cH+14} textAnchor="middle" fontSize="8" fill="#9CA3AF">{lbl}</text>
          ))}
        </svg>
      </div>

      <div className="mx-4 bg-white border border-[#E5E7EB] rounded-xl p-2.5 flex-1 overflow-hidden">
        <p className="text-[10px] font-semibold text-[#374151] mb-2">Channel Breakdown</p>
        <div className="grid grid-cols-4 text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1">
          <span>Channel</span><span>Leads</span><span>Convs</span><span>Share</span>
        </div>
        {[
          {name:"WhatsApp", color:"#25D366", leads:74, convs:98, pct:44},
          {name:"Instagram",color:"#E1306C", leads:58, convs:79, pct:35},
          {name:"Website",  color:"#6366F1", leads:35, convs:48, pct:21},
        ].map(({name,color,leads,convs,pct}, i)=>(
          <div key={name} className="grid grid-cols-4 items-center py-1.5 border-t border-[#F3F4F6]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{background:color}}/>
              <span className="text-[11px] text-[#374151]">{name}</span>
            </div>
            <span className="text-[11px] text-[#374151]">
              <CountUp target={leads} format={fmtInt} duration={700} delay={2500+i*380} />
            </span>
            <span className="text-[11px] text-[#374151]">
              <CountUp target={convs} format={fmtInt} duration={700} delay={2500+i*380} />
            </span>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background:color }}
                  initial={{ width:"0%" }}
                  animate={{ width:`${pct}%` }}
                  transition={{ duration:0.7, delay:2.5+i*0.38, ease:"easeOut" }}
                />
              </div>
              <span className="text-[10px] text-[#374151] font-semibold">
                <CountUp target={pct} format={fmtPctWhole} duration={700} delay={2500+i*380} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Tour panels: tab row + left content panel per scene ──────
   color is used only for the panel's icon circle + checklist tint
   (kept within Vela's orange/rose palette, varied per scene) --
   the tab row itself keeps the site's single-accent active style. */
const TOUR_PANELS = [
  {
    sceneIdx: CONV,
    tabLabel: "Conversation",
    color: "#ed5426",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M15 10.5a1.5 1.5 0 01-1.5 1.5H5.25L2.5 15V4a1.5 1.5 0 011.5-1.5h10A1.5 1.5 0 0115 4v6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
    headline: "Never miss a conversation",
    subtext: "Your AI replies across every channel, day or night.",
    checklist: [
      "AI replies 24/7",
      "Instagram, WhatsApp & Website",
      "Collects name & contact details",
      "Books appointments in-chat",
      "Answers FAQs instantly",
      "Escalates when needed",
    ],
  },
  {
    sceneIdx: APPT,
    tabLabel: "Appointments",
    color: "#F97316",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="3.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M2.5 7h13M6 2v3M12 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M6.5 10.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    headline: "Bookings that manage themselves",
    subtext: "Every appointment tracked, confirmed, and easy to change.",
    checklist: [
      "Auto-synced booking calendar",
      "Confirmed, Pending & Cancelled views",
      "One-tap reschedule",
      "Message customers directly",
      "Cancel with one click",
      "Every channel in one table",
    ],
  },
  {
    sceneIdx: CHAN,
    tabLabel: "Channels",
    color: "#FF6B35",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="4" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="4" cy="13.5" r="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="14" cy="9" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5.7 5.4L12.3 8.1M5.7 12.6L12.3 9.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
    headline: "One AI, every channel",
    subtext: "Connect Instagram, WhatsApp, and your website in minutes.",
    checklist: [
      "Instagram DMs",
      "WhatsApp Business",
      "Website live chat",
      "One-click connect flow",
      "Unified inbox, every channel",
      "Per-channel performance stats",
    ],
  },
  {
    sceneIdx: AGENT,
    tabLabel: "AI Agent",
    color: "#9e3819",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5.5A2.5 2.5 0 015.5 3h.5a1 1 0 01.95.684l.9 2.7a1 1 0 01-.273 1.054l-.9.9A9 9 0 009.66 11.32l.9-.9a1 1 0 011.054-.273l2.7.9A1 1 0 0115 12.01V12.5A2.5 2.5 0 0112.5 15C7.253 15 3 10.747 3 5.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    headline: "A voice agent that never misses a call",
    subtext: "Answers every inbound call and books the appointment.",
    checklist: [
      "Answers inbound calls 24/7",
      "Multilingual conversations",
      "Books appointments by phone",
      "Full call transcripts",
      "Call resolution tracking",
      "Transfers complex calls",
    ],
  },
  {
    sceneIdx: ANALY,
    tabLabel: "Analytics",
    color: "#FF3366",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 14h14M5 14V9m3 5V6m3 8V4m3 10v-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    headline: "See exactly what's working",
    subtext: "Full-funnel insights across every channel and touchpoint.",
    checklist: [
      "Leads, conversations & bookings",
      "30-day trend line chart",
      "Channel-by-channel breakdown",
      "AI resolution rate tracking",
      "7d / 30d / 90d ranges",
      "Full-funnel visibility",
    ],
  },
] as const;

/* ─── Smooth 3D dissolve transition (shallow angle + fade + scale) */
const sceneVariants = {
  enter:  { opacity: 0, rotateY:  10, scale: 0.97 },
  center: { opacity: 1, rotateY:   0, scale: 1,
            transition:{ duration: 0.42, ease:[0.22,1,0.36,1] as [number,number,number,number] } },
  exit:   { opacity: 0, rotateY: -10, scale: 0.97,
            transition:{ duration: 0.28, ease:[0.55,0,1,0.45] as [number,number,number,number] } },
};

/* ═══════════════════════════════════════════════════════════════
   ProductTourDemo. Main export
═══════════════════════════════════════════════════════════════ */
export default function ProductTourDemo() {
  const [scene, setScene] = useState(0);
  // false = hands-off autoplay (cycles all scenes forward, default).
  // true  = manual mode, entered by clicking a tab: the active scene loops
  // in place on repeat instead of advancing, until a different tab is clicked.
  const [manualMode, setManualMode] = useState(false);
  // Bumped each time the active scene needs to replay itself in manual mode
  // (scene index alone doesn't change on a loop, so this feeds the remount
  // key below to force a fresh mount -- same mechanism every scene already
  // relies on to replay its internal timers).
  const [replayTick, setReplayTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autoplay advances to the next scene after its own duration; manual mode
  // instead replays the same scene (bumps replayTick, scene index unchanged).
  // Re-registers whenever scene/mode/tick changes.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const duration = SCENE_DURATIONS[scene] ?? 3000;
    timerRef.current = setTimeout(() => {
      if (manualMode) {
        setReplayTick(t => t + 1);
      } else {
        setScene(prev => (prev + 1) % SCENE_COUNT);
      }
    }, duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [scene, manualMode, replayTick]);

  const handleTabClick = useCallback((idx: number) => {
    setManualMode(true);
    setScene(idx);
  }, []);

  function renderScene(s: number) {
    switch (s) {
      case CONV:  return <SceneConversation />;
      case APPT:  return <SceneAppointments />;
      case CHAN:  return <SceneChannels />;
      case AGENT: return <SceneAgent />;
      case ANALY: return <SceneAnalytics />;
      default:      return null;
    }
  }

  return (
    <section className="py-10 md:py-14 bg-white">
      <div className="max-w-7xl mx-auto px-5 md:px-6">

        {/* Section header — FIX 5+6 applied */}
        <div className="text-center mb-10 md:mb-14">
          <h2
            className="vela-heading text-[22px] sm:text-[28px] md:text-[34px] text-[#111111] leading-tight"
            style={{ textWrap:"balance" } as React.CSSProperties}
          >
            Watch Vela handle it all{" "}
            <span className="vela-gradient-text">and keep it organized for you.</span>
          </h2>
          <p className="text-[#6B7280] text-base md:text-lg mt-4 max-w-lg mx-auto leading-relaxed">
            Five core screens. Click any card to explore or let the tour run.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-start">

          {/* Left text panel: tab row + icon/headline/subtext/checklist panel + persistent CTA */}
          <div className="order-last lg:order-first flex flex-col lg:pt-2">

            {/* Tab row -- 5 literal-name tabs, text-only, single-accent active
                style (unchanged click-to-jump behavior, now manual-mode --
                see handleTabClick). Fits on one line at desktop widths via
                tight padding/font-size; falls back to horizontal scroll only
                if a narrow desktop width can't fit all 5; wraps freely on
                mobile where one-line isn't required. */}
            <div className="flex flex-wrap lg:flex-nowrap gap-1.5 mb-6 lg:overflow-x-auto lg:pb-1">
              {TOUR_PANELS.map(p => {
                const active = scene === p.sceneIdx;
                return (
                  <button
                    key={p.tabLabel}
                    onClick={() => handleTabClick(p.sceneIdx)}
                    className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200"
                    style={{
                      background: active ? "var(--vt-color)" : "#FAFAFA",
                      border:     active ? "1.5px solid var(--vp-color)" : "1.5px solid #F1F5F9",
                      color:      active ? "var(--vp-color)" : "#6B7280",
                    }}
                  >
                    {p.tabLabel}
                  </button>
                );
              })}
            </div>

            {/* Content panel -- icon circle, headline, subtext, 2-col checklist.
                Swapped per scene via AnimatePresence (fade/slide), same transition
                feel as the rest of the file. CTA lives outside this block so it
                never unmounts/re-animates on scene change (FIX 4: persistent). */}
            <AnimatePresence mode="wait">
              {(() => {
                const p = TOUR_PANELS.find(x => x.sceneIdx === scene) ?? TOUR_PANELS[0];
                return (
                  <motion.div
                    key={scene}
                    initial={{ opacity:0, y:10 }}
                    animate={{ opacity:1, y:0 }}
                    exit={{ opacity:0, y:-10 }}
                    transition={{ duration:0.35, ease:[0.22,1,0.36,1] }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mb-4 [&>svg]:w-5 [&>svg]:h-5 [&>svg]:text-white"
                      style={{ background:p.color }}
                    >{p.icon}</div>
                    <h3 className="font-inter font-extrabold text-[24px] md:text-[28px] text-[#111111] leading-tight tracking-tight">
                      {p.headline}
                    </h3>
                    <p className="text-[15px] text-[#6B7280] mt-2 leading-relaxed">{p.subtext}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5 mt-5">
                      {p.checklist.map(item => (
                        <div key={item} className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                            style={{ background:`${p.color}1A` }}
                          >
                            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                              <path d="M1.5 4.5l2 2 4-4" stroke={p.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                          <span className="text-[13px] text-[#374151] font-medium leading-snug">{item}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            <Link
              href="/auth/signup"
              className="btn-primary text-sm px-6 py-2.5 justify-center inline-flex items-center gap-2 mt-7 self-start"
            >
              Start 7-Day Free Trial
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M3 7.5h9M8.5 4l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
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

              {/* Scene area — perspective + overflow:hidden = no scrollbars ever */}
              <div
                className="relative"
                style={{ height:480, perspective:1400, perspectiveOrigin:"50% 40%", overflow:"hidden" }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${scene}-${replayTick}`}
                    variants={sceneVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="absolute inset-0"
                    style={{ backfaceVisibility:"hidden", willChange:"transform, opacity" }}
                  >
                    {renderScene(scene)}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
