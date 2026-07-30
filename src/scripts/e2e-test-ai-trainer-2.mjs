// AI Trainer 2.0 — verification suite
// Tests Phase 1+2 changes against real file contents (no auth required)

import { readFileSync } from "fs";
import { join } from "path";

const ROOT = "C:/Users/ahmed/OneDrive/Desktop/vela/src";
let passed = 0, failed = 0;

function check(label, ok) {
  if (ok) { passed++; console.log("  PASS:", label); }
  else     { failed++; console.error("  FAIL:", label); }
}

const saveCallSrc    = readFileSync(join(ROOT, "app/api/ai-agent/save-call/route.ts"), "utf8");
const trainingPgSrc  = readFileSync(join(ROOT, "app/app/ai-agent/training/page.tsx"), "utf8");
const trainingCtxSrc = readFileSync(join(ROOT, "app/api/ai-agent/training-context/route.ts"), "utf8");
const assistantSrc   = readFileSync(join(ROOT, "app/api/ai/assistant/route.ts"), "utf8");
const aiTrainingSrc  = readFileSync(join(ROOT, "app/api/ai-training/route.ts"), "utf8");

// ── A: save-call — toolCallKb wiring ─────────────────────────────────────────
console.log("\nA: save-call toolCallKb wiring");
check("A1 body type accepts toolCallKb",
  saveCallSrc.includes("toolCallKb?: Record<string, string>"));
check("A2 toolCallKb extracted from body",
  saveCallSrc.includes("const toolCallKb = body.toolCallKb ?? {}"));
check("A3 toolCallSection built with authoritative label",
  saveCallSrc.includes("INTERVIEW TOOL-CALL DATA"));
check("A4 toolCallSection in GPT user message",
  saveCallSrc.includes("toolCallSection}Transcript:"));
check("A5 hours override applied post-extraction",
  saveCallSrc.includes("typedKb.business.hours         = toolCallKb.hours"));
check("A6 location override applied post-extraction",
  saveCallSrc.includes("typedKb.business.address       = toolCallKb.location"));
check("A7 booking override applied post-extraction",
  saveCallSrc.includes("typedKb.business.bookingPolicy = toolCallKb.booking"));
check("A8 businessType appended to extra with marker",
  saveCallSrc.includes("Business type: ${toolCallKb.businessType"));
check("A9 special appended to extra with marker",
  saveCallSrc.includes("Unique selling point: ${toolCallKb.special"));
check("A10 extraParts joined with newlines",
  saveCallSrc.includes('extraParts].join("\\n\\n")') || saveCallSrc.includes("extraParts.join"));
check("A11 faqs still hardcoded [] (no regression)",
  saveCallSrc.includes("faqs: always return []"));

// ── B: training/page.tsx — toolCallKb forwarded ──────────────────────────────
console.log("\nB: training/page.tsx toolCallKb forwarding");
check("B1 toolCallKb included in save-call body",
  trainingPgSrc.includes("toolCallKb }") || trainingPgSrc.includes("toolCallKb\n"));
check("B2 toolCallKb still sent to call log",
  trainingPgSrc.includes("kb_extracted:") && trainingPgSrc.includes("toolCallKb"));

// ── C: training-context — businessType/special extracted from extra ───────────
console.log("\nC: training-context businessType/special extraction");
check("C1 businessType regex against kb.extra",
  trainingCtxSrc.includes("Business type:") && trainingCtxSrc.includes(".match("));
check("C2 special regex against kb.extra",
  trainingCtxSrc.includes("Unique selling point:") && trainingCtxSrc.includes(".match("));
check("C3 btMatch[1] → existingKb.businessType",
  trainingCtxSrc.includes("existingKb.businessType"));
check("C4 spMatch[1] → existingKb.special",
  trainingCtxSrc.includes("existingKb.special"));
check("C5 Business type marker stripped from faqText",
  trainingCtxSrc.includes(".replace(/^Business type:"));
check("C6 Unique selling point marker stripped from faqText",
  trainingCtxSrc.includes(".replace(/^Unique selling point:"));
check("C7 cleaned faqText used for existingKb.faqs",
  trainingCtxSrc.includes("faqText") && trainingCtxSrc.includes("existingKb.faqs"));
check("C8 existing topics still mapped (regression check)",
  trainingCtxSrc.includes("existingKb.services") &&
  trainingCtxSrc.includes("existingKb.hours") &&
  trainingCtxSrc.includes("existingKb.location") &&
  trainingCtxSrc.includes("existingKb.booking"));

// ── D: assistant/route.ts — pricing fixed ────────────────────────────────────
console.log("\nD: assistant pricing update");
check("D1 Starter now $95/mo", assistantSrc.includes("Starter — $95/mo"));
check("D2 Pro now $295/mo",    assistantSrc.includes("Pro — $295/mo"));
check("D3 Premium now $595/mo", assistantSrc.includes("Premium — $595/mo"));
check("D4 old $79/mo gone",    !assistantSrc.includes("$79/mo"));
check("D5 old $159/mo gone",   !assistantSrc.includes("$159/mo"));
check("D6 old $299/mo gone",   !assistantSrc.includes("$299/mo"));

// ── E: assistant/route.ts — chat interview 7 steps ───────────────────────────
console.log("\nE: chat interview 7-step structure");
check("E1 7-step interview declared",
  assistantSrc.includes("7-step interview"));
check("E2 5-step interview gone",
  !assistantSrc.includes("5-step interview"));
check("E3 Step 1 = business type",
  assistantSrc.includes("Step 1 — Business type"));
check("E4 Step 2 = services & prices",
  assistantSrc.includes("Step 2 — Services & prices"));
check("E5 Step 6 = FAQs",
  assistantSrc.includes("Step 6 — FAQs"));
check("E6 Step 7 = unique selling point",
  assistantSrc.includes("Step 7 — Unique selling point"));
check("E7 ivBtMatch extracts businessType from extra",
  assistantSrc.includes("ivBtMatch") && assistantSrc.includes("Business type:"));
check("E8 ivSpMatch extracts special from extra",
  assistantSrc.includes("ivSpMatch") && assistantSrc.includes("Unique selling point:"));
check("E9 ivFaqsText strips markers before showing",
  assistantSrc.includes("ivFaqsText") && assistantSrc.includes(".replace(/^Business type:"));
check("E10 ALREADY ON FILE includes business type entry",
  assistantSrc.includes("- business type:") && assistantSrc.includes("ivBtMatch[1]"));
check("E11 ALREADY ON FILE includes USP entry",
  assistantSrc.includes("- unique selling point:") && assistantSrc.includes("ivSpMatch[1]"));
check("E12 token rules step 2 for services",
  assistantSrc.includes("services from step 2"));
check("E13 token extra carries Business type marker",
  assistantSrc.includes("Business type: {step 1 answer}"));
check("E14 token extra carries USP marker",
  assistantSrc.includes("Unique selling point: {step 7 answer}"));
check("E15 VALIDATION mentions Step 7",
  assistantSrc.includes("Step 7 any differentiator"));

// ── F: ai-training/route.ts — merge strategy new-wins ────────────────────────
console.log("\nF: ai-training merge strategy");
check("F1 new services wins over existing",
  aiTrainingSrc.includes("body.services.length > 0 ? body.services : existing.services"));
check("F2 new faqs wins over existing",
  aiTrainingSrc.includes("body.faqs.length > 0") && aiTrainingSrc.includes("body.faqs") && aiTrainingSrc.includes(": existing.faqs"));
check("F3 new business.hours wins",
  aiTrainingSrc.includes("body.business.hours         || existing.business.hours"));
check("F4 new business.address wins",
  aiTrainingSrc.includes("body.business.address       || existing.business.address"));
check("F5 new bookingPolicy wins",
  aiTrainingSrc.includes("body.business.bookingPolicy || existing.business.bookingPolicy"));
check("F6 extra is appended not replaced",
  aiTrainingSrc.includes('[existing.extra, body.extra].filter(Boolean).join("\\n\\n")'));
check("F7 old existing-wins pattern gone for services",
  !aiTrainingSrc.includes("existing.services.length > 0 ? existing.services"));
check("F8 old existing-wins pattern gone for extra",
  !aiTrainingSrc.includes("existing.extra || body.extra"));

console.log(`\n${"=".repeat(44)}`);
console.log(`AI Trainer 2.0: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
