// Non-blocking regex lint: fails loudly (non-zero exit) if an em dash (—)
// or en dash (–) shows up anywhere in src/, outside an explicit
// "dash-lint-allow" exemption on the same line (used only where a literal
// dash character is functionally required, e.g. a regex that has to match
// a customer-typed en/em dash -- never for stylistic writing).
//
// Not wired into the build or CI (per Hard Rule scope for this fix) --
// run manually: node src/scripts/lint-no-dashes.mjs
import fs from "fs";
import path from "path";

const ROOT = "src";
const EXTS = [".ts", ".tsx", ".json"];
const EXEMPT_MARKER = "dash-lint-allow";
const DASH_RE = /[–—]/;

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, cb);
    else if (EXTS.includes(path.extname(entry.name))) cb(full);
  }
}

let violations = 0;
let exemptions = 0;

walk(ROOT, (full) => {
  const content = fs.readFileSync(full, "utf8");
  if (!DASH_RE.test(content)) return;
  const lines = content.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (!DASH_RE.test(line)) return;
    if (line.includes(EXEMPT_MARKER)) {
      exemptions++;
      return;
    }
    violations++;
    console.error(`${full}:${i + 1}: ${line.trim().slice(0, 160)}`);
  });
});

if (violations > 0) {
  console.error(`\n${violations} em/en-dash violation(s) found in ${ROOT}/. See lines above.`);
  console.error(`(${exemptions} line(s) exempted via "${EXEMPT_MARKER}".)`);
  process.exit(1);
} else {
  console.log(`Clean: zero em/en-dash characters in ${ROOT}/ outside ${exemptions} explicit exemption(s).`);
  process.exit(0);
}
