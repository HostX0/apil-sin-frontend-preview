/**
 * Arabic text normalisation — the single most important piece of text handling
 * in this product.
 *
 * Rationale (Phase 0, risk R-04): Iraqi users type the same name many ways.
 * Without folding, searching "احمد" will not find "أحمد", which is the defining
 * failure of competing products. Every searchable string is stored twice: as
 * entered (for display) and normalised (for matching and indexing).
 *
 * Strategy:
 *   1. NFKD decomposition — splits أ إ آ ؤ ئ into base letter + combining hamza,
 *      and unpacks presentation-form ligatures.
 *   2. Strip every Arabic combining mark — this folds the hamza forms to their
 *      base letters as a side effect, and removes all tashkeel.
 *   3. Fold the letter variants that have no canonical decomposition.
 *   4. Fold Arabic-Indic and Eastern Arabic-Indic digits to Western.
 *   5. Collapse whitespace, lowercase Latin.
 *
 * The output is a matching key only. Never display it, never store it as the
 * user's data, never round-trip through it.
 *
 * NOTE: every pattern below is written with \u escapes on purpose. This module
 * manipulates invisible characters; literal forms would be unreviewable and
 * silently corruptible by editors.
 */

/* eslint-disable no-irregular-whitespace --
 * This module exists to remove invisible characters, so its character classes
 * necessarily contain them. The escapes below are the authoritative form; if an
 * editor renders them literally, the ranges are still correct.
 */

/**
 * Combining marks to strip:
 *   U+0610–U+061A  honorific / annotation signs
 *   U+064B–U+065F  tashkeel + the combining hamza forms produced by NFKD
 *   U+0670         superscript alef
 *   U+06D6–U+06ED  Quranic annotation marks
 */
const COMBINING_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;

/** U+0640 tatweel / kashida — decorative elongation carrying no meaning. */
const TATWEEL = /ـ/g;

/**
 * Zero-width and bidi control characters that survive copy-paste from Word,
 * PDFs and WhatsApp: ZWSP/ZWNJ/ZWJ, LRM/RLM, the embedding and isolate controls,
 * and the BOM.
 */
const INVISIBLES = /[​-‏‪-‮⁠-⁤﻿]/g;

/** Letter variants with no canonical decomposition, plus Persian/Urdu look-alikes. */
const LETTER_FOLDS: ReadonlyArray<readonly [RegExp, string]> = [
  [/ى/g, 'ي'], // ى alef maksura      → ي
  [/ة/g, 'ه'], // ة taa marbuta       → ه
  [/ک/g, 'ك'], // ک Persian kaf       → ك
  [/ڪ/g, 'ك'], // ڪ swash kaf         → ك
  [/ی/g, 'ي'], // ی Farsi yeh         → ي
  [/ہ/g, 'ه'], // ہ heh goal          → ه
  [/ٱ/g, 'ا'], // ٱ alef wasla        → ا
  [/[ٲٳٵ]/g, 'ا'], // rare alef variants → ا
];

const ARABIC_INDIC_ZERO = 0x0660; // ٠ .. ٩
const EXT_ARABIC_INDIC_ZERO = 0x06f0; // ۰ .. ۹

/** Any Arabic-script letter, including presentation forms. */
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/**
 * Fold Arabic-Indic (٠١٢٣) and Eastern Arabic-Indic (۰۱۲۳) digits to Western (0123).
 *
 * Applied on write to every numeric field and on every search input, so the digit
 * style a user sees — a display preference — never affects what they can find.
 */
export function foldArabicDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    if (code >= ARABIC_INDIC_ZERO && code <= ARABIC_INDIC_ZERO + 9) {
      out += String(code - ARABIC_INDIC_ZERO);
    } else if (code >= EXT_ARABIC_INDIC_ZERO && code <= EXT_ARABIC_INDIC_ZERO + 9) {
      out += String(code - EXT_ARABIC_INDIC_ZERO);
    } else {
      out += ch;
    }
  }
  return out;
}

/** Render Western digits as Arabic-Indic for display. Presentation only — never stored. */
export function toArabicDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) =>
    String.fromCodePoint(ARABIC_INDIC_ZERO + Number.parseInt(d, 10)),
  );
}

/**
 * Produce the canonical matching key for an Arabic (or mixed) string.
 * Idempotent: normalizeArabic(normalizeArabic(x)) === normalizeArabic(x).
 */
export function normalizeArabic(input: string | null | undefined): string {
  if (!input) return '';

  let s = input.normalize('NFKD');
  s = s.replace(INVISIBLES, '');
  s = s.replace(COMBINING_MARKS, '');
  s = s.replace(TATWEEL, '');

  for (const [pattern, replacement] of LETTER_FOLDS) {
    s = s.replace(pattern, replacement);
  }

  s = foldArabicDigits(s);
  s = s.toLowerCase();
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Normalised token list, used to build search keys and to support
 * "any word, any order" matching on personal names.
 */
export function normalizedTokens(input: string | null | undefined): string[] {
  const normalized = normalizeArabic(input);
  return normalized.length === 0 ? [] : normalized.split(' ');
}

/** True when the string contains at least one Arabic-script character. */
export function containsArabic(input: string): boolean {
  return ARABIC_SCRIPT.test(input);
}
