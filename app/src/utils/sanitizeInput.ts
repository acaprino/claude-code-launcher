/**
 * Sanitize user input before sending to the agent.
 * Strips lone surrogates (cause API JSON parse errors),
 * normalizes smart typography, and removes zero-width characters.
 */
export function sanitizeInput(text: string): string {
  return text
    // Strip lone high surrogates not followed by low surrogate
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    // Strip lone low surrogates not preceded by high surrogate
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
    // Smart double quotes → straight
    .replace(/[\u201C\u201D]/g, '"')
    // Smart single quotes → straight
    .replace(/[\u2018\u2019]/g, "'")
    // Em dash → --
    .replace(/\u2014/g, "--")
    // En dash → -
    .replace(/\u2013/g, "-")
    // Ellipsis → ...
    .replace(/\u2026/g, "...")
    // Zero-width characters (ZWSP, ZWNJ, ZWJ, BOM)
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
}
