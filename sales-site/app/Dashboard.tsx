"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Job, Lead, LogLine, Progress, Stats, Worker } from "@/lib/types";
import LeadCard from "./LeadCard";

const ONLINE_MS = 90_000; // heartbeat every 30 s; offline after 3 missed beats
const TASK_LABEL: Record<string, string> = {
  power: "ON / OFF", hunt: "Deep hunt", find: "Find new leads", today: "Build today's list", followups: "Follow-ups due",
  rescore: "Re-score", rewrite: "Rewrite message", sender: "WhatsApp session", log: "Status", check: "After-hours check",
};
const clock = (t: string) => new Date(t).toLocaleString("en-GB", { hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit" });
const elapsed = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`; };

/** Live card for the job running on the laptop: step in plain words, leads found, time, log lines. */
function ProgressCard({ p, logs, now }: { p: Progress; logs: LogLine[]; now: number }) {
  const lines = logs.filter((l) => l.job_id === p.job_id).slice(-8);
  return (
    <section className="card progress" aria-live="polite">
      <div className="row" style={{ flexWrap: "nowrap" }}><span className="pulse" aria-hidden /><h2 style={{ margin: 0, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{TASK_LABEL[p.task] ?? p.label}</h2></div>
      <div className="step" style={{ marginTop: 6 }}>{p.step}</div>
      {p.line ? <div className="muted" style={{ overflowWrap: "anywhere" }}>{p.line}</div> : null}
      <div className="pnums">
        <div><b>{p.found}</b><span>{p.task === "find" ? "Leads found" : "New leads"}</span></div>
        <div><b>{elapsed(now - Date.parse(p.started_at))}</b><span>Elapsed</span></div>
        <div><b>{lines.length ? new Date(lines[lines.length - 1].created_at).toLocaleTimeString("en-GB", { hour12: false }) : "..."}</b><span>Last update</span></div>
      </div>
      <div className="log">
        {lines.map((l) => <div key={l.id} className={l.kind}><span className="t">{new Date(l.created_at).toLocaleTimeString("en-GB", { hour12: false })}  </span>{l.line}</div>)}
        {!lines.length ? <div className="t">Waiting for the first log line...</div> : null}
      </div>
    </section>
  );
}

type Tab = "today" | "leads" | "checks" | "log";
const STATUS_OPTIONS = ["new", "sent", "replied", "demo-booked", "trial", "won", "lost", "do-not-contact", "known-contact"];

type AngleRow = { status: string; contacted_at: string | null; last_contacted_at: string | null; replied_at: string | null; angle: string | null };
const ANGLES: [string, string][] = [["after-hours", "After hours"], ["friday", "Friday"], ["branches", "Branches"], ["peak-hours", "Peak hours"], ["whatsapp-backlog", "WhatsApp backlog"]];
const REPLIED = new Set(["replied", "demo-booked", "trial", "won"]);

/** A/B test of the question angle in message 1: sent, replied and reply rate per angle. */
function AngleTest({ rows }: { rows: AngleRow[] }) {
  const s = ANGLES.map(([k, label]) => {
    const sent = rows.filter((r) => r.angle === k && r.status !== "new" && (r.contacted_at || r.last_contacted_at));
    const rep = sent.filter((r) => REPLIED.has(r.status) || r.replied_at).length;
    return { k, label, sent: sent.length, rep, rate: sent.length ? Math.round((rep / sent.length) * 1000) / 10 : 0, queued: rows.filter((r) => r.angle === k && r.status === "new").length };
  });
  const tested = s.every((x) => x.sent >= 20);
  const best = tested ? [...s].sort((a, b) => b.rate - a.rate)[0] : null;
  return (
    <section className="card">
      <div className="row"><h2 style={{ margin: 0 }}>Question angle test</h2><span className="sp" /><span className="muted">{best ? `Favoring ${best.label} 70/30` : "Balanced until each angle has 20 sends"}</span></div>
      <div className="angles">
        {s.map((x) => (
          <div key={x.k} className={`angle${best?.k === x.k ? " best" : ""}`}>
            <strong>{x.label}</strong>
            <span>{x.sent} sent · {x.rep} replied</span>
            <b>{x.sent ? `${x.rate}%` : "No sends yet"}</b>
            <div className="meter"><i style={{ width: `${Math.min(100, (x.sent / 20) * 100)}%` }} /></div>
            <span className="muted">{x.queued} ready</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard({ email }: { email: string }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [today, setToday] = useState<Lead[]>([]);
  const [replied, setReplied] = useState<Lead[]>([]);
  const [checks, setChecks] = useState<Lead[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [angleRows, setAngleRows] = useState<AngleRow[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [tab, setTab] = useState<Tab>("today");
  const [count, setCount] = useState(20);
  const [toastMsg, setToastMsg] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [setupError, setSetupError] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  const toast = useCallback((m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(""), 3200); }, []);
  // Online = a recent heartbeat and not stopped on purpose (heartbeat_at stays as "last seen").
  const online = !!worker?.heartbeat_at && worker.sender_status !== "offline" && now - Date.parse(worker.heartbeat_at) < ONLINE_MS;
  const progress = online ? worker?.hunt?.progress ?? null : null;

  const load = useCallback(async () => {
    const [w, s, t, r, c, j, a] = await Promise.all([
      sb.from("sales_worker").select("*").eq("id", 1).maybeSingle(),
      sb.from("sales_stats").select("*").maybeSingle(),
      sb.from("sales_leads").select("*").or("in_today.eq.true,followup_due.not.is.null").order("today_rank", { ascending: true, nullsFirst: true }).limit(80),
      sb.from("sales_leads").select("*").eq("status", "replied").order("replied_at", { ascending: false, nullsFirst: false }).limit(20),
      sb.from("sales_leads").select("*").not("check_plan", "is", null).is("check_result", null).in("status", ["new", "sent"]).order("score", { ascending: false }).limit(60),
      sb.from("sales_jobs").select("*").order("created_at", { ascending: false }).limit(12),
      sb.from("sales_leads").select("status,contacted_at,last_contacted_at,replied_at,angle:message->>angle_key").not("message", "is", null).limit(5000),
    ]);
    if (w.error) { setSetupError(w.error.message); return; }
    setSetupError("");
    setWorker(w.data as Worker | null); setStats(s.data as Stats | null);
    setToday((t.data ?? []) as Lead[]); setReplied((r.data ?? []) as Lead[]); setChecks((c.data ?? []) as Lead[]); setJobs((j.data ?? []) as Job[]); setAngleRows((a.data ?? []) as AngleRow[]);
  }, [sb]);

  useEffect(() => {
    load();
    sb.from("sales_logs").select("*").order("created_at", { ascending: false }).limit(200).then(({ data }) => setLogs(((data ?? []) as LogLine[]).reverse()));
    let timer: ReturnType<typeof setTimeout> | null = null;
    const soon = () => { if (timer) clearTimeout(timer); timer = setTimeout(load, 1500); };
    const ch = sb.channel("sales-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_worker" }, (p) => setWorker(p.new as Worker))
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_jobs" }, soon)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sales_logs" }, (p) => { setLogs((x) => [...x.slice(-399), p.new as LogLine]); soon(); })
      .subscribe();
    const poll = setInterval(load, 30_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { sb.removeChannel(ch); clearInterval(poll); clearInterval(tick); if (timer) clearTimeout(timer); };
  }, [sb, load]);

  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [logs, tab]);

  /** Every button only queues a job; the laptop worker runs it. */
  const queue = useCallback(async (task: string, params: Record<string, unknown> = {}, done?: string) => {
    const { error } = await sb.from("sales_jobs").insert({ task, params, requested_by: email });
    if (error) return toast(`Could not queue: ${error.message}`);
    toast(online ? done ?? `${TASK_LABEL[task]} queued` : "Will start when your laptop is online");
    load();
  }, [sb, email, online, toast, load]);

  const hunt = worker?.hunt ?? {};
  const cellsTotal = stats?.cells_total || hunt.cells || 384, cellsDone = stats?.cells_done ?? hunt.done ?? 0;
  const pct = (a: number, b: number) => `${Math.min(100, b ? (a / b) * 100 : 0)}%`;
  const senderOpen = !!worker?.sender_status?.startsWith("open");

  return (
    <>
      <header className="top">
        <div className="topIn">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Vela" />
          <span className={`pill status ${online ? "on" : "off"}`} title={online ? undefined : "Laptop worker not running"}><span className="dot" />{online ? `Online · ${worker?.running ?? (worker?.sender_status?.startsWith("open") ? "WhatsApp session" : "Idle")}` : "Laptop worker not running"}</span>
          <span className="sp" />
          <button className="switch" role="switch" aria-checked={!!worker?.power_on} aria-label="Agents on or off"
            onClick={() => { const on = !worker?.power_on; if (!on && !confirm("Switch OFF? The running job stops and the queue is cleared.")) return; queue("power", { on }, on ? "Switching ON" : "Switching OFF"); }} />
        </div>
      </header>

      <main className="wrap">
        {setupError ? <div className="banner">The sales tables are not ready ({setupError}). Run supabase/migration_v45.sql and add your email to sales_admins.</div> : null}
        {!online && !setupError ? <div className="banner"><b>Laptop worker not running.</b> It starts automatically when your PC turns on. Last seen: {worker?.heartbeat_at ? clock(worker.heartbeat_at) : "never"}. Buttons still work: jobs wait and start when it is back.</div> : null}
        {progress ? <ProgressCard p={progress} logs={logs} now={now} /> : null}

        {replied.length ? (
          <section className="card" style={{ borderColor: "#86efac" }}>
            <h2>Replied, your turn ({replied.length})</h2>
            <div className="list">{replied.map((l) => <LeadCard key={l.slug} lead={l} queue={queue} toast={toast} />)}</div>
          </section>
        ) : null}

        <section className="card">
          <div className="row"><h2 style={{ margin: 0 }}>Now</h2><span className="sp" /><span className="muted">{online ? (worker?.running ? `Running: ${worker.running}` : "Idle") : "Laptop worker not running"}</span></div>
          {worker?.queue?.length ? <div className="muted">Waiting on the laptop: {worker.queue.join(", ")}</div> : null}
          <div className="controls" style={{ marginTop: 10 }}>
            <button className={`btn ${hunt.on ? "" : "primary"}`} onClick={() => queue("hunt", { on: !hunt.on }, hunt.on ? "Stopping the deep hunt" : "Starting the deep hunt")}>{hunt.on ? "Stop deep hunt" : "Start deep hunt"}</button>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input type="number" min={1} max={60} value={count} onChange={(e) => setCount(Math.max(1, Math.min(60, Number(e.target.value) || 20)))} aria-label="How many leads" style={{ width: 76, flex: "none" }} />
              <button className="btn" style={{ flex: 1 }} onClick={() => queue("find", { count })}>Find new leads</button>
            </div>
            <button className="btn" onClick={() => queue("today")}>Build today&apos;s list</button>
            <button className="btn" onClick={() => queue("followups")}>Follow-ups due</button>
            <button className="btn" onClick={() => queue("rescore")}>Re-score after checks</button>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              {senderOpen
                ? <button className="btn danger" style={{ flex: 1 }} onClick={() => queue("sender", { action: "stop" }, "Closing the WhatsApp session")}>Stop WhatsApp session</button>
                : <><button className="btn" style={{ flex: 1 }} onClick={() => queue("sender", { action: "now" }, "WhatsApp session opening on the laptop")}>WhatsApp session now</button>
                  <button className="btn" onClick={() => queue("sender", { action: "schedule" }, "Scheduled sessions opening on the laptop")}>Schedule</button></>}
            </div>
          </div>
          <button className="btn" disabled={!worker?.hunt?.demo_to || senderOpen} onClick={() => queue("sender", { action: "demo" }, "Demo opening on the laptop: press Send there")}>
            {worker?.hunt?.demo_to ? `Send the demo to my phone (${worker.hunt.demo_to})` : "Send the demo to my phone (set DEMO_NUMBER on the laptop)"}
          </button>
          <p className="muted" style={{ marginBottom: 0 }}>The WhatsApp session opens on the laptop: you press Send there for every message. {hunt.note ?? ""}</p>
          {jobs.length ? (
            <details style={{ marginTop: 8 }}>
              <summary className="muted">Recent jobs</summary>
              <div className="jobs" style={{ marginTop: 6 }}>
                {jobs.map((j) => <div key={j.id} className="row" style={{ flexWrap: "nowrap" }}><span className={`status ${j.status === "done" ? "won" : j.status === "failed" || j.status === "stopped" ? "lost" : "sent"}`}>{j.status}</span><span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{TASK_LABEL[j.task] ?? j.task}{j.result ? `: ${j.result}` : ""}</span></div>)}
              </div>
            </details>
          ) : null}
        </section>

        <section className="grid">
          {[["Total leads", stats?.total_leads], ["Owners found", stats?.owners_found], ["Ready to contact", stats?.ready], ["Sent today", `${worker?.today_sent ?? stats?.sent_today ?? 0} / ${worker?.daily_limit ?? 60}`],
            ["Sent total", stats?.sent_total], ["Replied", stats?.replied], ["Demos booked", stats?.demos_booked], ["Won", stats?.won]].map(([k, v]) => (
            <div key={String(k)} className="card stat"><b>{v ?? 0}</b><span>{k}</span></div>
          ))}
        </section>

        <AngleTest rows={angleRows} />

        <section className="card">
          <div className="row"><h2 style={{ margin: 0 }}>Deep hunt</h2><span className="sp" /><span className="muted">{cellsDone} of {cellsTotal} batches</span></div>
          <div className="meter"><i style={{ width: pct(cellsDone, cellsTotal) }} /></div>
          <div className="row"><span className="muted">ElevenLabs this week</span><span className="sp" /><span className="muted">{(worker?.eleven_week ?? 0).toLocaleString("en-US")} of {(worker?.eleven_cap ?? 15000).toLocaleString("en-US")}</span></div>
          <div className="meter"><i style={{ width: pct(worker?.eleven_week ?? 0, worker?.eleven_cap ?? 15000) }} /></div>
          {stats?.by_niche ? <div className="muted">{Object.entries(stats.by_niche).sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} ${c}`).join(" · ")}</div> : null}
        </section>

        <nav className="tabs" role="tablist">
          {([["today", `Today (${today.length})`], ["leads", "All leads"], ["checks", `Check plan (${checks.length})`], ["log", "Live log"]] as [Tab, string][]).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
          ))}
        </nav>

        {tab === "today" ? (
          <div className="list">
            {today.length ? today.map((l) => <LeadCard key={l.slug} lead={l} queue={queue} toast={toast} />) : <div className="card muted">Nothing on today&apos;s list yet. Build today&apos;s list or start the hunt.</div>}
          </div>
        ) : null}
        {tab === "leads" ? <AllLeads queue={queue} toast={toast} /> : null}
        {tab === "checks" ? <Checks leads={checks} queue={queue} /> : null}
        {tab === "log" ? (
          <div className="log" ref={logRef} aria-live="polite">
            {logs.map((l) => <div key={l.id} className={l.kind}><span className="t">{new Date(l.created_at).toLocaleTimeString("en-GB", { hour12: false })}  </span>{l.line}</div>)}
            {!logs.length ? <div className="t">No log lines yet.</div> : null}
          </div>
        ) : null}

        <form action="/auth/signout" method="post" className="row" style={{ justifyContent: "center", marginTop: 8 }}>
          <span className="muted">{email}</span><button className="btn small">Sign out</button>
        </form>
      </main>
      {toastMsg ? <div className="toast" role="status">{toastMsg}</div> : null}
    </>
  );
}

function AllLeads({ queue, toast }: { queue: (t: string, p: Record<string, unknown>, d?: string) => void; toast: (m: string) => void }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [q, setQ] = useState(""); const [niche, setNiche] = useState(""); const [status, setStatus] = useState(""); const [route, setRoute] = useState(""); const [min, setMin] = useState("");
  const [rows, setRows] = useState<Lead[]>([]); const [open, setOpen] = useState<string | null>(null); const [niches, setNiches] = useState<string[]>([]);
  useEffect(() => { sb.from("sales_stats").select("by_niche").maybeSingle().then(({ data }) => setNiches(Object.keys((data?.by_niche as Record<string, number>) ?? {}).sort())); }, [sb]);
  useEffect(() => {
    const t = setTimeout(async () => {
      let query = sb.from("sales_leads").select("*").order("score", { ascending: false, nullsFirst: false }).limit(100);
      const term = q.trim().replace(/[%,()]/g, " ").slice(0, 60);
      if (term) query = query.or(`name.ilike.%${term}%,area.ilike.%${term}%,owner_name.ilike.%${term}%`);
      if (niche) query = query.eq("niche", niche);
      if (status) query = query.eq("status", status);
      if (route) query = route === "none" ? query.is("route", null) : query.eq("route", route);
      if (min) query = query.gte("score", Number(min));
      const { data } = await query; setRows((data ?? []) as Lead[]);
    }, 300);
    return () => clearTimeout(t);
  }, [sb, q, niche, status, route, min]);
  return (
    <div className="stack">
      <div className="filters">
        <input type="search" placeholder="Search name, area, owner" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <select value={niche} onChange={(e) => setNiche(e.target.value)} aria-label="Niche"><option value="">All niches</option>{niches.map((n) => <option key={n}>{n}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option>{STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={route} onChange={(e) => setRoute(e.target.value)} aria-label="Route"><option value="">All routes</option><option>A</option><option>B</option><option>C</option><option value="none">No route</option></select>
        <select value={min} onChange={(e) => setMin(e.target.value)} aria-label="Minimum score"><option value="">Any score</option>{[9, 8, 7, 6, 5].map((s) => <option key={s} value={s}>{s}+</option>)}</select>
      </div>
      <div className="muted">{rows.length === 100 ? "First 100 matches" : `${rows.length} match(es)`}</div>
      <div className="list">
        {rows.map((l) => open === l.slug ? <LeadCard key={l.slug} lead={l} queue={queue} toast={toast} /> : (
          <button key={l.slug} className="rowLead" onClick={() => setOpen(l.slug)}>
            <span className={`score${(l.score ?? 0) >= 7 ? "" : " lo"}`}>{l.score ?? "?"}</span>
            <span className="meta"><div><strong>{l.name}</strong></div><div className="muted">{l.niche} · {l.area} · {l.owner_name ?? "owner not found"}</div></span>
            {l.route ? <span className="route">{l.route}</span> : null}
            <span className={`status ${l.status}`}>{l.status}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Checks({ leads, queue }: { leads: Lead[]; queue: (t: string, p: Record<string, unknown>, d?: string) => void }) {
  const [form, setForm] = useState<Record<string, { sent: string; reply: string }>>({});
  const TIME = /^\d{1,2}:\d{2}$/;
  return (
    <div className="list">
      <p className="muted" style={{ margin: 0 }}>Send one natural booking question by hand, 30 to 60 minutes after they close, on the WhatsApp or Instagram they publish. Log when you sent it and when (or if) they answered.</p>
      {leads.map((l) => {
        const f = form[l.slug] ?? { sent: "", reply: "none" };
        const set = (p: Partial<typeof f>) => setForm((x) => ({ ...x, [l.slug]: { ...f, ...p } }));
        const wa = String(l.whatsapp_public ?? "").replace(/\D/g, "");
        return (
          <article key={l.slug} className="card stack">
            <div className="row"><strong className="sp">{l.name}</strong><span className="pill">closes {l.check_plan?.closes}</span></div>
            <span className="pill on" style={{ alignSelf: "flex-start" }}>Check between {l.check_plan?.from} and {l.check_plan?.to}</span>
            <div className="msg" dir="rtl">{l.check_plan?.question}</div>
            <div className="row">
              <button className="btn small" onClick={() => navigator.clipboard.writeText(l.check_plan?.question ?? "")}>Copy question</button>
              {wa.length >= 8 ? <a className="btn small primary" href={`https://wa.me/${wa.length === 8 ? `974${wa}` : wa}`} target="_blank" rel="noopener noreferrer">Open their WhatsApp</a> : null}
              {/^https:\/\//.test(l.instagram ?? "") ? <a className="btn small" href={l.instagram!} target="_blank" rel="noopener noreferrer">Open their Instagram</a> : null}
            </div>
            <form className="row" style={{ flexWrap: "nowrap" }} onSubmit={(e) => {
              e.preventDefault();
              if (!TIME.test(f.sent) || !(f.reply === "none" || TIME.test(f.reply))) return alert("Times as HH:MM, reply HH:MM or none");
              queue("check", { slug: l.slug, sent: f.sent, reply: f.reply }, `Check logged for ${l.name}`);
            }}>
              <input placeholder="sent 22:40" value={f.sent} onChange={(e) => set({ sent: e.target.value.trim() })} aria-label="Sent time" />
              <input placeholder="reply or none" value={f.reply} onChange={(e) => set({ reply: e.target.value.trim() || "none" })} aria-label="Reply time" />
              <button className="btn primary small" style={{ minHeight: 44 }}>Log</button>
            </form>
          </article>
        );
      })}
      {!leads.length ? <div className="card muted">No checks planned. Leads need a known closing time and a public WhatsApp or Instagram.</div> : null}
    </div>
  );
}
