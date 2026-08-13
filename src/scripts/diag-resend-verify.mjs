// Verifies RESEND_API_KEY is a real, working key by pulling the live Vercel
// production value (not just checking presence) and sending a real test email
// to Resend's official test address (delivered@resend.dev), which simulates
// successful delivery without reaching a real inbox.
// Run: node src/scripts/diag-resend-verify.mjs
import { execSync } from "child_process";
import { readFileSync, unlinkSync, existsSync } from "fs";

const TMP = ".env.production.tmp";

try {
  execSync(`npx vercel env pull ${TMP} --environment production --scope brandlab --yes`, { stdio: "pipe" });

  const env = {};
  for (const line of readFileSync(TMP, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  const key = env.RESEND_API_KEY;

  if (!key || key === "[SENSITIVE]") {
    console.log("RESEND_API_KEY not readable (absent or marked Sensitive in Vercel).");
    process.exit(1);
  }
  console.log("Key found — prefix:", key.slice(0, 3), "| length:", key.length);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Vela <onboarding@resend.dev>",
      to: "delivered@resend.dev",
      subject: "Vela diagnostic — Resend send test",
      text: "Automated verification that RESEND_API_KEY can send. Sent to Resend's test address — never reaches a real inbox.",
    }),
  });

  console.log("HTTP status:", res.status);
  console.log("Body:", await res.text());
} finally {
  if (existsSync(TMP)) unlinkSync(TMP);
}
