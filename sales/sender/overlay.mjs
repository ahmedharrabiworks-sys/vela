// The sender's in-window overlay: orange cursor, caption at the top, and a
// control bar (big STOP plus the step buttons). Injected with addInitScript,
// so it survives WhatsApp's own navigations. DOM only (no innerHTML).
export function overlay() {
  const build = () => {
    if (document.getElementById("__vela_bar")) return;
    const z = "2147483647";
    const cur = document.createElement("div");
    cur.id = "__vela_cursor";
    Object.assign(cur.style, { position: "fixed", left: "0", top: "0", width: "34px", height: "34px", borderRadius: "50%", background: "rgba(237,84,38,0.92)", boxShadow: "0 0 0 8px rgba(237,84,38,0.22), 0 8px 24px rgba(0,0,0,0.25)", zIndex: z, pointerEvents: "none", transform: "translate(50vw, 40vh)", transition: "transform 600ms cubic-bezier(.16,1,.3,1)" });
    const cap = document.createElement("div");
    cap.id = "__vela_caption";
    Object.assign(cap.style, { position: "fixed", top: "10px", left: "50%", transform: "translateX(-50%)", maxWidth: "92vw", padding: "10px 18px", borderRadius: "999px", background: "#111", color: "#fff", font: "600 15px/1.35 Inter, system-ui, sans-serif", zIndex: z, pointerEvents: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.25)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
    cap.textContent = "Vela sender";
    const bar = document.createElement("div");
    bar.id = "__vela_bar";
    Object.assign(bar.style, { position: "fixed", right: "16px", bottom: "16px", display: "flex", gap: "8px", alignItems: "center", zIndex: z, font: "700 14px/1 Inter, system-ui, sans-serif" });
    const steps = document.createElement("div");
    steps.id = "__vela_steps";
    Object.assign(steps.style, { display: "flex", gap: "8px" });
    const stop = document.createElement("button");
    stop.textContent = "STOP";
    stop.title = "Stop the sender now";
    Object.assign(stop.style, { minWidth: "120px", height: "56px", border: "0", borderRadius: "14px", background: "#b91c1c", color: "#fff", font: "800 20px/1 Inter, system-ui, sans-serif", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" });
    stop.addEventListener("click", () => { cap.textContent = "Stopping..."; window.__velaControl?.("stop"); });
    bar.append(steps, stop);
    document.documentElement.append(cur, cap, bar);
  };
  window.__velaSet = ({ caption, buttons = [] } = {}) => {
    build();
    if (caption !== undefined) document.getElementById("__vela_caption").textContent = caption;
    const steps = document.getElementById("__vela_steps");
    steps.replaceChildren(...buttons.map((b) => {
      const el = document.createElement("button");
      el.textContent = b.label;
      Object.assign(el.style, { height: "56px", padding: "0 18px", border: "0", borderRadius: "14px", cursor: "pointer", font: "700 15px/1 Inter, system-ui, sans-serif", background: b.primary ? "linear-gradient(135deg,#ed5426,#9e3819)" : "#fff", color: b.primary ? "#fff" : "#111", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" });
      el.addEventListener("click", () => window.__velaControl?.(b.id));
      return el;
    }));
  };
  window.__velaPoint = (selector, ms = 600) => {
    build();
    const el = document.querySelector(selector), cur = document.getElementById("__vela_cursor");
    if (!el || !cur) return false;
    const r = el.getBoundingClientRect();
    cur.style.transition = `transform ${ms}ms cubic-bezier(.16,1,.3,1)`;
    cur.style.transform = `translate(${Math.round(r.left + r.width / 2 - 17)}px, ${Math.round(r.top + r.height / 2 - 17)}px)`;
    el.style.outline = "3px solid rgba(237,84,38,0.75)"; el.style.outlineOffset = "3px"; el.style.borderRadius = el.style.borderRadius || "8px";
    setTimeout(() => { el.style.outline = ""; el.style.outlineOffset = ""; }, 8000);
    return true;
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
}
