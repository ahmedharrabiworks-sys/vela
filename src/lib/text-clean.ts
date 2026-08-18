/**
 * Standing project rule (already applied to written copy sitewide): no em
 * dash, en dash, or double-hyphen in anything the product writes or says.
 * System prompts instruct every AI surface not to use them, but this is a
 * cheap, deterministic backstop for the rare case a model slips one in
 * anyway -- applied to real-time AI chat replies (customer-facing widget
 * and the owner-facing business assistant) and Website Builder's
 * AI-generated copy.
 */
export function stripAiTells(text: string): string {
  return text
    .replace(/\s*--\s*/g, ", ")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}
