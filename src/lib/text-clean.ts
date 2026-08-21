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

/**
 * FIX 1 (round J): the internal owner-facing assistant is a chat surface,
 * not a markdown renderer -- replies must read like a person texting, not
 * like raw markdown source. Deliberately separate from stripAiTells (which
 * is also used by the customer-facing widget and Website Builder's copy
 * generation, where this transform doesn't apply) so this only ever touches
 * the one surface it's meant for.
 */
export function stripMarkdownFormatting(text: string): string {
  return text
    .replace(/```[a-zA-Z]*\n?/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();
}
