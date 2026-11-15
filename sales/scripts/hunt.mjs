// The deep hunt's resumable plan: every niche x area is one "cell" of up to
// batch_size leads. State lives in sales/data/hunt/plan.json, so a hunt can be
// stopped (OFF switch, usage limit, closed laptop) and resumed at any time.
//   node sales/scripts/hunt.mjs init             add any missing cells (keeps progress)
//   node sales/scripts/hunt.mjs next             claim the next cell, prints CELL {json}
//   node sales/scripts/hunt.mjs seen "<name>" ["<phone>"] ["<instagram>"]   new or duplicate
//   node sales/scripts/hunt.mjs done <id> <found> [--exhausted]
//   node sales/scripts/hunt.mjs release          put claimed (unfinished) cells back
//   node sales/scripts/hunt.mjs status
import fs from "node:fs";
import path from "node:path";
import { DATA, config, findDuplicate, readLeads, slugify } from "./lib.mjs";

const DIR = path.join(DATA, "hunt");
const PLAN = path.join(DIR, "plan.json");
const STALE_MS = 3 * 3600e3; // a claimed cell untouched for 3 h was interrupted

const load = () => (fs.existsSync(PLAN) ? JSON.parse(fs.readFileSync(PLAN, "utf8")) : { cells: [] });
const save = (p) => { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(PLAN + ".tmp", JSON.stringify(p, null, 1)); fs.renameSync(PLAN + ".tmp", PLAN); };

function init(p = load()) {
  const { niches, areas } = config().hunt;
  const have = new Set(p.cells.map((c) => c.id));
  // Interleave niches so the hunt spreads across niches before going deep in one.
  areas.forEach((area, ai) => niches.forEach((niche) => {
    const id = `${niche}--${slugify(area)}`;
    if (!have.has(id)) p.cells.push({ id, niche, area, order: ai * 1000 + niches.indexOf(niche), status: "todo", found: 0 });
  }));
  p.cells.sort((a, b) => a.order - b.order);
  save(p);
  return p;
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "init") {
  const p = init();
  console.log(`plan: ${p.cells.length} cells (${p.cells.filter((c) => c.status === "todo").length} to do)`);
} else if (cmd === "next") {
  const p = init();
  for (const c of p.cells) if (c.status === "claimed" && Date.now() - Date.parse(c.claimed_at) > STALE_MS) c.status = "todo";
  const cell = p.cells.find((c) => c.status === "todo");
  if (!cell) { save(p); console.log("PLAN COMPLETE: every niche and area has been hunted."); process.exit(0); }
  cell.status = "claimed"; cell.claimed_at = new Date().toISOString();
  save(p);
  const total = readLeads().length;
  console.log(`CELL ${JSON.stringify({ id: cell.id, niche: cell.niche, area: cell.area, batch_size: config().hunt.batch_size, leads_so_far: total, target: config().hunt.target_total })}`);
} else if (cmd === "seen") {
  const [name, phone, instagram] = args;
  const dup = findDuplicate(readLeads(), { name, phone_public: phone, instagram });
  console.log(dup ? `duplicate of ${dup.slug} (${dup.name}): skip` : "new");
} else if (cmd === "done") {
  const [id, found] = args;
  const p = load(); const cell = p.cells.find((c) => c.id === id);
  if (!cell) { console.error(`no cell ${id}`); process.exit(1); }
  cell.status = args.includes("--exhausted") ? "exhausted" : "done";
  cell.found = (cell.found || 0) + (Number(found) || 0);
  cell.done_at = new Date().toISOString();
  save(p);
  console.log(`${id}: ${cell.status}, ${cell.found} found`);
} else if (cmd === "release") {
  const p = load(); let n = 0;
  for (const c of p.cells) if (c.status === "claimed") { c.status = "todo"; n++; }
  save(p); console.log(`released ${n} cell(s)`);
} else if (cmd === "status") {
  const p = load(), by = (s) => p.cells.filter((c) => c.status === s).length;
  console.log(JSON.stringify({ cells: p.cells.length, todo: by("todo"), claimed: by("claimed"), done: by("done"), exhausted: by("exhausted"), leads: readLeads().length, target: config().hunt.target_total }));
} else {
  console.error("usage: hunt.mjs init | next | seen <name> [phone] [instagram] | done <id> <found> [--exhausted] | release | status");
  process.exit(1);
}
