// Live reproduction of FIX 8: paste a real image (a simple price-list PNG
// rendered on the fly) into the floating VelaAssistant and see what
// actually happens -- root-causing with real evidence instead of theorizing
// about the client code.
import { chromium } from "@playwright/test";
import * as fs from "fs";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://vela-g8h4.vercel.app";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: "e2e/.auth/user.json" });
  const page = await context.newPage();

  await page.goto(`${BASE}/app`);
  await page.waitForLoadState("networkidle");

  const bubble = page.getByLabel("Open Vela AI Assistant");
  await bubble.click();
  await page.waitForTimeout(500);

  // Build a simple PNG in the browser (a canvas with text "Haircut $30")
  // and dispatch a real "paste" ClipboardEvent carrying it as image/png --
  // this exercises the exact same code path a real OS clipboard paste
  // would (React's onPaste reads event.clipboardData.items).
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 300; canvas.height = 120;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, 300, 120);
    ctx.fillStyle = "black"; ctx.font = "20px sans-serif";
    ctx.fillText("Haircut - $30", 20, 40);
    ctx.fillText("Beard Trim - $15", 20, 70);
    const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
    const file = new File([blob], "pricelist.png", { type: "image/png" });

    const dt = new DataTransfer();
    dt.items.add(file);

    const textarea = document.querySelector("textarea");
    if (!textarea) return { ok: false, reason: "no textarea found" };
    textarea.focus();

    const pasteEvent = new ClipboardEvent("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, "clipboardData", { value: dt });
    textarea.dispatchEvent(pasteEvent);

    return { ok: true };
  });
  console.log("Paste dispatch result:", JSON.stringify(result));

  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-results/round11-fix8-after-paste.png" });

  // Check if a thumbnail preview appeared (confirms attachedImages state updated).
  const thumbCount = await page.locator('img[alt=""]').count();
  console.log("Thumbnail/image elements visible in the panel after paste:", thumbCount);

  // Now send it with a short instruction.
  const textarea = page.locator("textarea");
  await textarea.fill("Here's our price list, please save it");
  await textarea.press("Enter");
  await page.waitForTimeout(8000);

  const replyText = await page.locator(".bg-\\[\\#F3F4F6\\].text-\\[\\#111111\\]").last().textContent();
  console.log("Assistant reply after image paste + send:", replyText);
  await page.screenshot({ path: "test-results/round11-fix8-after-send.png" });

  fs.writeFileSync("test-results/round11-fix8-result.json", JSON.stringify({ thumbCount, replyText }, null, 2));

  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
