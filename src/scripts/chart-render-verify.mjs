import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = "file://" + path.join(__dirname, "chart-render-test.html").replace(/\\/g, "/");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 720, height: 300 } });
  await page.goto(filePath);
  await page.waitForTimeout(200);
  await page.screenshot({ path: "chart-render-nohover.png" });

  const svg = page.locator("#chart");
  const box = await svg.boundingBox();
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.4);
  await page.waitForTimeout(200);
  await page.screenshot({ path: "chart-render-hover.png" });

  const tooltipText = await page.locator("#tooltip").textContent();
  console.log("Tooltip text on hover:", tooltipText);
  await browser.close();
})();
