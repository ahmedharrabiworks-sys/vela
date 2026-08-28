import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto("https://linear.app", { waitUntil: "networkidle", timeout: 30000 });

  // Find the element containing a real issue-id label (e.g. "ENG-2085") and
  // walk up to characterize the real list-row structure: row height,
  // padding, gap to next row, background vs page background.
  const rowInfo = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("*"));
    const idEl = all.find((el) => el.children.length === 0 && /^ENG-\d+$/.test(el.textContent?.trim() ?? ""));
    if (!idEl) return { found: false };

    // Walk up to find the repeating "row" container (parent whose siblings
    // look structurally similar -- has a sibling with the same tag+class).
    let node = idEl;
    let row = null;
    for (let i = 0; i < 8 && node.parentElement; i++) {
      node = node.parentElement;
      const parent = node.parentElement;
      if (!parent) continue;
      const siblings = Array.from(parent.children).filter((s) => s.tagName === node.tagName);
      if (siblings.length >= 3) { row = node; break; }
    }
    if (!row) return { found: true, rowFound: false };

    const cs = getComputedStyle(row);
    const rect = row.getBoundingClientRect();
    const parent = row.parentElement;
    const parentCs = parent ? getComputedStyle(parent) : null;

    // Gap to the next sibling row (real vertical rhythm).
    const next = row.nextElementSibling;
    let gapToNext = null;
    if (next) {
      const nextRect = next.getBoundingClientRect();
      gapToNext = Math.round(nextRect.top - rect.bottom);
    }

    return {
      found: true,
      rowFound: true,
      rowTag: row.tagName,
      rowClass: row.className,
      rowHeight: Math.round(rect.height),
      rowPadding: { top: cs.paddingTop, bottom: cs.paddingBottom, left: cs.paddingLeft, right: cs.paddingRight },
      rowBackground: cs.backgroundColor,
      rowBorderBottom: `${cs.borderBottomWidth} ${cs.borderBottomColor}`,
      gapToNextRow: gapToNext,
      parentBackground: parentCs?.backgroundColor,
      parentPadding: parentCs ? { top: parentCs.paddingTop, left: parentCs.paddingLeft } : null,
      parentGap: parentCs?.rowGap ?? parentCs?.gap,
    };
  });
  console.log("Real issue-row structure:", JSON.stringify(rowInfo, null, 2));

  // Also: page background vs the nearest "panel"/"card" background actually
  // behind the product screenshot area, to characterize real surface count.
  const surfaces = await page.evaluate(() => {
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const idEl = Array.from(document.querySelectorAll("*")).find(
      (el) => el.children.length === 0 && /^ENG-\d+$/.test(el.textContent?.trim() ?? "")
    );
    const chain = [];
    let node = idEl;
    for (let i = 0; i < 12 && node; i++) {
      const cs = getComputedStyle(node);
      if (cs.backgroundColor !== "rgba(0, 0, 0, 0)") {
        chain.push({ tag: node.tagName, cls: (node.className || "").toString().slice(0, 40), bg: cs.backgroundColor });
      }
      node = node.parentElement;
    }
    return { bodyBg, chain };
  });
  console.log("\nSurface layering chain (issue row -> body):", JSON.stringify(surfaces, null, 2));

  await browser.close();
})();
