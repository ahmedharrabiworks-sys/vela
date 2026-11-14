// Shared, read-only page reader for the research agents.
// - Public pages only: login, account, checkout and admin pages are refused,
//   and so are local or private network addresses.
// - Never clicks, types or submits: every non-GET request is blocked.
// - Watch mode: an orange cursor glides to each element before it is read,
//   with a soft highlight and a caption at the top of the page.

const BLOCKED_PATH = /\/(login|log-in|signin|sign-in|signup|sign-up|register|account|accounts|auth|oauth|checkout|cart|basket|payment|wp-admin|wp-login|admin|dashboard|my-account)(\/|$|\?|\.)/i;
const BLOCKED_HOST = /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.local$|.*\.internal$)/i;

/** Returns a URL object for a public http(s) page, or throws why not. */
export function checkUrl(raw) {
  let u;
  try { u = new URL(String(raw)); } catch { throw new Error("not a valid URL"); }
  if (!/^https?:$/.test(u.protocol)) throw new Error("only http and https pages");
  if (BLOCKED_HOST.test(u.hostname)) throw new Error("local or private addresses are not allowed");
  if (BLOCKED_PATH.test(u.pathname)) throw new Error("login, account and checkout pages are not opened");
  if (u.username || u.password) throw new Error("URLs with credentials are not allowed");
  return u;
}

const KEYWORDS = /review|rating|stars|price|qar|hours|open|close|book|appointment|whatsapp|call|founder|owner|director|manager|team|doctor|about|branch|location|تقييم|سعر|حجز|مواعيد|المؤسس|المدير/i;

/** Reads one page; in watch mode shows the cursor and caption. Never clicks. */
export async function readPage(page, { url, caption = "", find = "", speed = 600, watch = false }) {
  const target = checkUrl(url);
  await page.route("**/*", (route) => {
    const req = route.request();
    if (req.method() !== "GET" && req.method() !== "HEAD") return route.abort();
    if (req.isNavigationRequest() && req.frame() === page.mainFrame()) {
      try { checkUrl(req.url()); } catch { return route.abort(); }
    }
    return route.continue();
  });
  try {
    await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(watch ? 900 : 400);
    if (watch) await glide(page, { caption, find, speed });
    const out = await page.evaluate((needle) => {
      const text = (document.body?.innerText ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      const lines = needle ? text.split("\n").filter((l) => l.toLowerCase().includes(needle.toLowerCase())).slice(0, 40) : [];
      return { title: document.title, url: location.href, matches: lines, text: text.slice(0, 12000), truncated: text.length > 12000 };
    }, find);
    return out;
  } finally {
    await page.unroute("**/*").catch(() => {});
  }
}

async function glide(page, { caption, find, speed }) {
  const ms = Math.max(150, Math.min(2500, Number(speed) || 600));
  await page.evaluate(({ caption: cap }) => {
    document.getElementById("__vela_cursor")?.remove();
    document.getElementById("__vela_caption")?.remove();
    const cur = document.createElement("div");
    cur.id = "__vela_cursor";
    Object.assign(cur.style, { position: "fixed", left: "0", top: "0", width: "34px", height: "34px", borderRadius: "50%", background: "rgba(237,84,38,0.92)", boxShadow: "0 0 0 8px rgba(237,84,38,0.22), 0 8px 24px rgba(0,0,0,0.25)", zIndex: "2147483647", pointerEvents: "none", transform: "translate(40vw, 30vh)", transition: "transform 600ms cubic-bezier(.16,1,.3,1)" });
    const bar = document.createElement("div");
    bar.id = "__vela_caption";
    bar.textContent = cap || "Reading";
    Object.assign(bar.style, { position: "fixed", top: "12px", left: "50%", transform: "translateX(-50%)", maxWidth: "90vw", padding: "10px 18px", borderRadius: "999px", background: "#111", color: "#fff", font: "600 15px/1.3 Inter, system-ui, sans-serif", zIndex: "2147483647", pointerEvents: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.25)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
    document.documentElement.append(cur, bar);
  }, { caption });

  // Pick what to read: matches for the requested text first, then headings and
  // likely facts (reviews, hours, prices, team), in page order, at most 6.
  const handles = await page.evaluateHandle(({ needle, kw }) => {
    const re = new RegExp(kw, "i");
    const els = Array.from(document.querySelectorAll("h1, h2, h3, p, li, td, span, a, div"))
      .filter((el) => {
        const t = (el.innerText || "").trim();
        if (!t || t.length > 220 || el.children.length > 3) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 20 || r.height < 8) return false;
        return needle ? t.toLowerCase().includes(needle.toLowerCase()) : (/^H[1-3]$/.test(el.tagName) || re.test(t));
      });
    const seen = new Set(), picked = [];
    for (const el of els) { if (picked.length >= 6) break; if ([...seen].some((s) => s.contains(el) || el.contains(s))) continue; seen.add(el); picked.push(el); }
    return picked;
  }, { needle: find, kw: KEYWORDS.source });
  const count = await handles.evaluate((a) => a.length);
  for (let i = 0; i < count; i++) {
    await handles.evaluate((a, args) => {
      const el = a[args.i]; if (!el) return;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, { i });
    await page.waitForTimeout(Math.round(ms * 0.4));
    await handles.evaluate(async (a, args) => {
      const el = a[args.i], cur = document.getElementById("__vela_cursor"); if (!el || !cur) return;
      // Wait for the smooth scroll to settle (position stable for 3 frames, max ~1.5s).
      const frame = () => new Promise((r) => requestAnimationFrame(r));
      let last = -1, still = 0;
      for (let f = 0; f < 90 && still < 3; f++) { await frame(); const y = el.getBoundingClientRect().top; still = Math.abs(y - last) < 0.5 ? still + 1 : 0; last = y; }
      const r = el.getBoundingClientRect();
      cur.style.transition = `transform ${args.ms}ms cubic-bezier(.16,1,.3,1)`;
      cur.style.transform = `translate(${Math.round(r.left + Math.min(r.width, 300) / 2 - 17)}px, ${Math.round(r.top + r.height / 2 - 17)}px)`;
      document.querySelectorAll("[data-vela-reading]").forEach((x) => { x.style.background = x.dataset.velaBg; x.style.outline = x.dataset.velaOutline; x.removeAttribute("data-vela-reading"); });
      el.dataset.velaBg = el.style.background; el.dataset.velaOutline = el.style.outline;
      el.setAttribute("data-vela-reading", "");
      el.style.background = "rgba(237,84,38,0.12)"; el.style.outline = "2px solid rgba(237,84,38,0.55)"; el.style.borderRadius = el.style.borderRadius || "6px";
    }, { i, ms });
    await page.waitForTimeout(ms + 250);
  }
  await handles.dispose();
}
