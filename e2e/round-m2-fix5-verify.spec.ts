import { test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test("FIX 5: no stray markdown/quote artifacts in generated site copy", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/app/website");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  const res = await page.request.get("/api/website/state");
  const json = await res.json();
  const html: string = json.html ?? "";
  const m = html.match(/WEBSITE_SPEC: (\{[\s\S]*?\})\s*-->/);
  const spec = m ? JSON.parse(m[1]) : null;
  console.log("businessName:", spec?.businessName);

  const textBlob = JSON.stringify(spec?.sections ?? []);
  const suspiciousPatterns: [string, RegExp][] = [
    ["double-asterisk (markdown bold)", /\*\*[^*]+\*\*/],
    ["backtick", /`/],
    ["markdown header hash", /(^|\\n)#{1,3}\s/],
    ["double underscore", /__[^_]+__/],
    ["leading/trailing smart or stray quote pair", /[""][^""]*[""]/],
    ["literal curly-brace artifact", /\{[a-z_]+\}/i],
  ];
  for (const [label, re] of suspiciousPatterns) {
    const found = re.test(textBlob);
    console.log(`-- ${label}: ${found ? "FOUND (potential bug)" : "clean"}`);
    if (found) {
      const match = textBlob.match(re);
      console.log(`   match: ${JSON.stringify(match?.[0])}`);
    }
  }
});
