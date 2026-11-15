// Vela sales panel client. Everything that comes from lead data is set with
// textContent (never innerHTML): it comes from public web pages.
const $ = (s) => document.querySelector(s);
const el = (tag, props = {}, ...kids) => { const n = document.createElement(tag); Object.assign(n, props); for (const k of kids) n.append(k); return n; };
let data = null;

async function post(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) toast(out.error || out.out || "That did not work");
  return out;
}
function toast(msg) {
  const t = el("div", { className: "toast", textContent: msg });
  document.body.append(t); setTimeout(() => t.remove(), 3500);
}

function renderState(s) {
  const pill = $("#status"), text = $("#statusText");
  pill.className = "pill " + (!s.on ? "off" : s.running ? "run" : "idle");
  text.textContent = !s.on ? "Stopped" : s.running ? `Running: ${s.running.label}` : "Idle";
  $("#power").setAttribute("aria-checked", String(s.on));
  $("#powerLabel").textContent = s.on ? "ON" : "OFF";
  $("#watch").setAttribute("aria-checked", String(s.watch));
  $("#speed").value = s.speed; $("#speedVal").textContent = `${s.speed} ms`;
  $("#queue").textContent = s.queue.length ? `Waiting: ${s.queue.join(", ")}` : "";
  document.querySelectorAll("[data-run]").forEach((b) => { b.disabled = !s.on || !s.claude; });
  if (!s.claude) $("#queue").textContent = "Claude Code was not found on this computer. Set CLAUDE_BIN and restart the panel.";
  // Deep hunt
  const h = s.hunt;
  $("#huntBtn").textContent = h.on ? "Stop deep hunt" : "Start deep hunt";
  $("#huntBtn").className = h.on ? "btn" : "btn p";
  $("#huntBtn").disabled = !s.on && !h.on;
  $("#huntCells").style.width = `${h.cells ? (h.done / h.cells) * 100 : 0}%`;
  $("#huntCellsText").textContent = h.cells ? `${h.done} of ${h.cells} done` : "Plan not started";
  $("#huntBatches").textContent = h.on ? `${h.batchesToday} batch(es) today` : "";
  $("#huntNote").textContent = h.note || "";
  // Sender
  $("#sendNow").disabled = $("#sendSchedule").disabled = !s.on || s.sender.running;
  $("#sendStop").disabled = !s.sender.running;
}

function renderData(d) {
  data = d;
  const stats = [["Leads found", d.stats.found], ["Ready to contact", d.stats.ready], ["Sent", d.stats.sent], ["Replied", d.stats.replied], ["Demos booked", d.stats.demos], ["Won", d.stats.won]];
  $("#stats").replaceChildren(...stats.map(([k, v]) => el("div", { className: "card stat" }, el("b", { textContent: String(v) }), el("span", { textContent: k }))));
  const pct = (a, b) => `${Math.min(100, b ? (a / b) * 100 : 0)}%`;
  $("#elevenBar").style.width = pct(d.budget.eleven_week, d.budget.eleven_cap);
  $("#elevenText").textContent = `${d.budget.eleven_week.toLocaleString("en-US")} of ${d.budget.eleven_cap.toLocaleString("en-US")} (resets Sunday)`;
  const target = 2000;
  $("#huntLeads").style.width = pct(d.total_leads, target);
  $("#huntLeadsText").textContent = `${d.total_leads.toLocaleString("en-US")} of ${target.toLocaleString("en-US")}`;
  $("#sentBar").style.width = pct(d.send.sent_today, d.send.limit);
  $("#sentText").textContent = `${d.send.sent_today} of ${d.send.limit}`;
  $("#sendInfo").textContent = `${d.send.queue} ready in today's queue. Sessions: ${d.send.sessions.map((x) => `${x.name} ${x.at}`).join(", ")} (Qatar time).${d.sender?.running ? " Sender window is open." : ""}`;
  $("#turn").replaceChildren(...(d.your_turn.length ? d.your_turn.map((t) => el("div", { className: "turn" }, el("strong", { textContent: t.name }), el("span", { className: "hint", textContent: `${t.dm ? `${t.dm} · ` : ""}${t.at ? String(t.at).slice(0, 16).replace("T", " ") : ""}` }), el("span", { className: "status replied", textContent: "your turn" }))) : [el("span", { textContent: "No replies yet." })]));
  $("#leadCount").textContent = `${d.leads.length < d.total_leads ? `top ${d.leads.length} of ` : ""}${d.total_leads}`;
  $("#vapiBar").style.width = pct(d.budget.vapi_total, d.budget.vapi_cap);
  $("#vapiText").textContent = `$${Number(d.budget.vapi_total).toFixed(2)} of $${d.budget.vapi_cap}`;

  const sel = $("#checkLead"), keep = sel.value;
  sel.replaceChildren(...d.leads.filter((l) => !["do-not-contact", "known-contact", "won", "lost"].includes(l.status)).map((l) => el("option", { value: l.slug, textContent: `${l.name} (${l.score})` })));
  if (keep) sel.value = keep;

  $("#leads").replaceChildren(...d.leads.map((l) => {
    const sc = el("span", { className: "score" + (l.score >= 7 ? "" : " lo"), textContent: String(l.score) });
    const biz = el("div", {}, el("strong", { textContent: l.name }));
    if (l.check) biz.append(el("div", { className: "hint", textContent: `Check: ${l.check}` }));
    if (l.demo) biz.append(el("div", { className: "hint", textContent: "Personalised demo ready" }));
    const actions = el("div", { className: "row" });
    const locked = l.status === "do-not-contact";
    for (const [status, label] of [["sent", "Sent"], ["replied", "Replied"], ["do-not-contact", "Do not contact"]]) {
      const b = el("button", { className: "btn s", textContent: label, disabled: locked || l.status === "known-contact" && status !== "do-not-contact" });
      b.addEventListener("click", async () => {
        if (status === "do-not-contact" && !confirm(`Mark ${l.name} as do not contact? This is permanent.`)) return;
        const r = await post("/api/log", { slug: l.slug, status });
        if (r.ok) refresh();
      });
      actions.append(b);
    }
    const more = el("select", { className: "btn s", ariaLabel: "Other status" }, el("option", { value: "", textContent: "More" }), ...d.statuses.filter((s) => !["sent", "replied", "do-not-contact"].includes(s)).map((s) => el("option", { value: s, textContent: s })));
    more.disabled = locked;
    more.addEventListener("change", async () => { if (!more.value) return; const r = await post("/api/log", { slug: l.slug, status: more.value }); if (r.ok) refresh(); });
    actions.append(more);
    const row = el("tr", {},
      el("td", {}, sc),
      el("td", {}, biz),
      el("td", { textContent: l.dm || "Not found" }),
      el("td", {}, l.route ? el("span", { className: "route", textContent: l.route, title: { A: "Owner direct", B: "Business WhatsApp, forwarded to the owner", C: "Instagram DM to the business" }[l.route] }) : el("span", { className: "hint", textContent: "none" })),
      el("td", {}, el("span", { className: `status ${l.status}`, textContent: l.status })),
      el("td", { textContent: l.next }),
      el("td", {}, actions));
    return row;
  }));
}

async function refresh() {
  const res = await fetch(`/api/state?q=${encodeURIComponent($("#search").value.trim())}`);
  if (!res.ok) return;
  const d = await res.json();
  renderState(d); renderData(d);
}

function addLog(e) {
  const box = $("#log");
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  box.append(el("div", { className: e.kind }, el("span", { className: "t", textContent: `${e.at}  ` }), e.text));
  while (box.childElementCount > 600) box.firstChild.remove();
  if (atBottom) box.scrollTop = box.scrollHeight;
}

// Live updates
const es = new EventSource("/api/events");
let refreshTimer = null;
es.onopen = () => $("#log").replaceChildren(); // the server replays recent lines on connect
es.onmessage = (m) => {
  const e = JSON.parse(m.data);
  if (e.type === "log") { addLog(e); clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 800); }
  if (e.type === "state") renderState(e.state);
};
es.onerror = () => addLog({ at: new Date().toLocaleTimeString("en-GB"), text: "Connection to the panel lost. Is it still running?", kind: "error" });

// Controls
$("#power").addEventListener("click", async () => {
  const on = $("#power").getAttribute("aria-checked") !== "true";
  if (!on && !confirm("Switch OFF? The running agent stops immediately and the queue is cleared.")) return;
  await post("/api/power", { on });
});
$("#watch").addEventListener("click", () => post("/api/watch", { on: $("#watch").getAttribute("aria-checked") !== "true", speed: Number($("#speed").value) }));
$("#speed").addEventListener("input", () => { $("#speedVal").textContent = `${$("#speed").value} ms`; });
$("#speed").addEventListener("change", () => post("/api/watch", { on: $("#watch").getAttribute("aria-checked") === "true", speed: Number($("#speed").value) }));
document.querySelectorAll("[data-run]").forEach((b) => b.addEventListener("click", () => post("/api/run", { task: b.dataset.run, count: Number($("#count").value) })));
$("#checkForm").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const r = await post("/api/check", { slug: $("#checkLead").value, sent: $("#checkSent").value.trim(), reply: $("#checkReply").value.trim() || "none" });
  if (r.ok) { toast("Check logged"); $("#checkSent").value = ""; refresh(); }
});

$("#huntBtn").addEventListener("click", () => post("/api/hunt", { on: $("#huntBtn").textContent.startsWith("Start") }));
$("#sendNow").addEventListener("click", () => post("/api/sender", { action: "now" }));
$("#sendSchedule").addEventListener("click", () => post("/api/sender", { action: "schedule" }));
$("#sendStop").addEventListener("click", () => post("/api/sender", { action: "stop" }));
let searchTimer = null;
$("#search").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(refresh, 300); });

// Tabs
document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll("nav button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
  for (const t of ["panel", "today", "check"]) $(`#tab-${t}`).classList.toggle("hidden", t !== b.dataset.tab);
  if (b.dataset.tab === "today") $("#todayFrame").src = `/files/today.html?ts=${Date.now()}`;
  if (b.dataset.tab === "check") $("#checkFrame").src = `/files/check-plan.html?ts=${Date.now()}`;
}));

refresh();
