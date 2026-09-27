// One-off render of the 4 email templates to PNG previews so Oussama can
// see them before pasting into Supabase. Replaces Supabase's template vars
// with realistic sample values purely for the screenshot -- the actual
// .html files pasted into Supabase keep the real {{ .ConfirmationURL }} etc.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

const templates = [
  { file: "confirm-signup.html", out: "email-confirm-signup.png" },
  { file: "reset-password.html", out: "email-reset-password.png" },
  { file: "change-email.html", out: "email-change-email.png" },
  { file: "magic-link.html", out: "email-magic-link.png" },
];

const root = process.cwd();
const templatesDir = path.join(root, "supabase", "email-templates");
const outDir = path.join(root, "verification");
mkdirSync(outDir, { recursive: true });

const sampleVars = {
  "{{ .ConfirmationURL }}": "https://velaos.co/auth/callback?code=sample-preview-code",
  "{{ .Email }}": "oussama@example.com",
  "{{ .NewEmail }}": "oussama.new@example.com",
  "{{ .SiteURL }}": "https://velaos.co",
  "{{ .Token }}": "482913",
  "{{ .TokenHash }}": "sample-preview-token-hash",
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 900 } });

for (const t of templates) {
  let html = readFileSync(path.join(templatesDir, t.file), "utf8");
  for (const [k, v] of Object.entries(sampleVars)) {
    html = html.split(k).join(v);
  }
  await page.setContent(html, { waitUntil: "load" });
  const outPath = path.join(outDir, t.out);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`Rendered ${t.file} -> verification/${t.out}`);
}

await browser.close();
