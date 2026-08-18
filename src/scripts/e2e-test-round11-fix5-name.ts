// Live reproduction of FIX 5: book a full appointment where the customer's
// phone is given first (creating a lead with the placeholder name), and
// their REAL name is only stated in a LATER message that does not repeat
// the phone number -- the exact bug scenario. Confirms the resulting
// Appointments row shows the real name, not "Website Visitor".
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://vela-g8h4.vercel.app";
const TENANT_ID = "4579c6b6-3839-4ddb-be96-265c03a73ca5";

async function send(message: string, conversationId?: string) {
  const res = await fetch(`${BASE}/api/ai/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId: TENANT_ID, message, conversationId, channel: "website", customerName: "Website Visitor" }),
  });
  return res.json() as Promise<{ reply: string; conversationId: string; booked: boolean; booking: unknown }>;
}

async function main() {
  let convId: string | undefined;

  let r = await send("Hi, my number is 0555998877, I'd like to book a coaching session tomorrow at 2pm", convId);
  convId = r.conversationId;
  console.log("Turn 1:", r.reply);

  r = await send("Actually my name is Fatima Al Rashid, not sure if I said that", convId);
  console.log("Turn 2 (name only, no phone repeated):", r.reply);

  r = await send("Yes tomorrow 2pm works, please confirm", convId);
  console.log("Turn 3 (confirm booking):", r.reply, JSON.stringify(r.booking));

  // Give the DB a moment then check the real lead + appointment name.
  await new Promise((res) => setTimeout(res, 1500));

  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: "e2e/.auth/user.json" });
  const page = await context.newPage();
  await page.goto(`${BASE}/app/appointments`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  const bodyText = await page.textContent("body");
  const hasRealName = bodyText?.includes("Fatima Al Rashid") ?? false;
  const hasPlaceholder = bodyText?.includes("Website Visitor") ?? false;
  console.log("Appointments page contains 'Fatima Al Rashid':", hasRealName);
  console.log("Appointments page contains 'Website Visitor' placeholder:", hasPlaceholder);
  await page.screenshot({ path: "test-results/round11-fix5-appointments.png", fullPage: true });
  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
