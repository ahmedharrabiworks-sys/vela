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
 * FIX 3 (round M): "If there's anything else you need, just let me know!"
 * and its close variants kept appearing after nearly every reply on both AI
 * chat surfaces despite repeated system-prompt instructions against it --
 * model instruction-following on this specific tic proved unreliable, so
 * this is a deterministic backstop (same pattern as stripAiTells above):
 * strip the trailing filler clause outright, regardless of what the model
 * does. Only matches at the END of the text (a customer/owner could
 * legitimately ask "let me know if X" mid-sentence about something real --
 * this never touches that), and loops in case more than one filler clause
 * got stacked. Applied to both the customer-facing widget and the
 * owner-facing business assistant.
 *
 * Real bug caught in live testing (twice): a first version using several
 * separately-tried patterns could have a SHORTER, later-listed pattern
 * (e.g. "...anything else!") fire before a LONGER, earlier-listed one whose
 * match would have consumed the same text plus more before it (e.g. "Feel
 * free to reach out if you need anything else!") -- since the short match
 * ran first and ate the trailing punctuation, the long pattern's own
 * trailing-punctuation requirement then failed to match what was left,
 * stranding a dangling fragment on screen ("Feel free to reach out"). Fixed
 * by combining every trigger phrase into ONE alternation in a SINGLE
 * pattern: regex alternation is leftmost-match, so whichever trigger phrase
 * starts EARLIEST in the string always wins, and `[^]*$` after it always
 * consumes everything through the true end in one shot -- no partial
 * fragment can ever survive. The lookbehind requires the trigger to begin
 * its own sentence (right after `. ` / `! ` / `? `, or the very start of
 * the text) specifically so a legitimate sentence that happens to start
 * with "If you have..." about something REAL and specific (e.g. "If you
 * have a specific area in mind...") is never touched -- only matched when
 * paired with one of the exact generic filler trigger phrases below.
 */
export function stripFillerClosers(text: string): string {
  const FILLER_RE = /(?<=^|[.!?]\s)(?:if\s+(?:there'?s|there\s+is)\s+anything\s+else\s+you\s+(?:need|want|require)|if\s+you\s+(?:have|need)\s+any(?:thing|\s*(?:other\s+)?question[s]?)|(?:just\s+)?let\s+me\s+know\s+if\s+you\s+(?:need|have|want)|feel\s+free\s+to\s+(?:reach\s+out|ask)|(?:please\s+)?(?:let\s+me\s+know|reach\s+out)\s+if\s+you\s+(?:need|have|want)|how\s+can\s+i\s+(?:assist|help)\s+you|don'?t\s+hesitate\s+to\s+(?:reach\s+out|ask|contact\s+(?:me|us)))[^]*$/i;
  return text.replace(FILLER_RE, "").trim();
}

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
