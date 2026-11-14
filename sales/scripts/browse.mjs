// What the research agents use to READ a public page.
//   node sales/scripts/browse.mjs "<url>" --caption "Reading reviews for X" [--find "text"]
// Started from the control panel: the panel's browser opens it (visible in
// Watch mode, with the orange cursor). Otherwise: a private headless browser.
// Prints the page title, matches for --find and the visible text.
import path from "node:path";
import { createRequire } from "node:module";
import { checkUrl, readPage } from "./browser-core.mjs";
import { ROOT } from "./lib.mjs";

const args = process.argv.slice(2);
const url = args[0];
const opt = (name) => { const i = args.indexOf(`--${name}`); return i > 0 ? args[i + 1] ?? "" : ""; };
const caption = opt("caption").slice(0, 120);
const find = opt("find").slice(0, 80);

function print(r) {
  console.log(`TITLE: ${r.title}\nURL: ${r.url}`);
  if (r.matches?.length) console.log(`MATCHES for "${find}":\n${r.matches.join("\n")}`);
  console.log(`TEXT${r.truncated ? " (first 12,000 characters)" : ""}:\n${r.text}`);
}

try {
  checkUrl(url);
  if (process.env.PANEL_URL && process.env.PANEL_BROWSE_TOKEN) {
    const res = await fetch(`${process.env.PANEL_URL}/api/browse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-browse-token": process.env.PANEL_BROWSE_TOKEN },
      body: JSON.stringify({ url, caption, find }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || `panel browser ${res.status}`);
    print(body);
  } else {
    const require = createRequire(path.join(ROOT, "package.json"));
    const { chromium } = require("playwright");
    const browser = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ channel: "msedge", headless: true }));
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      print(await readPage(page, { url, caption, find, watch: false }));
    } finally { await browser.close(); }
  }
} catch (e) {
  console.log(`COULD NOT READ ${url}: ${e.message}. Record this as unknown; do not guess.`);
  process.exitCode = 0;
}
