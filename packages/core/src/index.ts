/** ZimanKit: explicit profiles, no language inference, no spelling correction. */
export const VERSION = "0.1.0";
export const MAX_TEXT_LENGTH = 20_000;
export type Language = "sorani" | "kurmanji" | "unicode";
export type Operation = "normalize" | "clean" | "transliterate";
export type Direction = "arabic-to-latin" | "latin-to-arabic";
export interface Options {
  language?: Language;
  operation?: Operation;
  direction?: Direction;
  kurdishVariants?: boolean;
  collapseSpaces?: boolean;
  trimLines?: boolean;
  normalizeLineEndings?: boolean;
  punctuationSpacing?: boolean;
  removeTatweel?: boolean;
  removeControls?: boolean;
}
export interface Change {
  rule: string;
  label: string;
  count: number;
  examples: { before: string; after: string }[];
}
export interface ScriptInfo {
  kind: "arabic" | "latin" | "mixed" | "unknown";
  direction: "rtl" | "ltr";
  arabicLetters: number;
  latinLetters: number;
  otherLetters: number;
}
export interface Statistics {
  words: number;
  characters: number;
  codePoints: number;
  sentences: number;
  lines: number;
}
export interface Result {
  original: string;
  text: string;
  language: Language;
  operation: Operation;
  script: ScriptInfo;
  outputScript: ScriptInfo;
  statistics: Statistics;
  changes: Change[];
  warnings: string[];
  experimental: boolean;
  version: string;
}

const arabic = /\p{Script_Extensions=Arabic}/u;
const latin = /\p{Script_Extensions=Latin}/u;
const letter = /\p{L}/u;
const graphemes = new Intl.Segmenter("und", { granularity: "grapheme" });

/** Script detection counts letters, not punctuation, digits, or emoji. */
export function detectScript(text: string): ScriptInfo {
  let arabicLetters = 0,
    latinLetters = 0,
    otherLetters = 0;
  let first: "rtl" | "ltr" | undefined;
  for (const char of text) {
    if (!letter.test(char)) continue;
    if (arabic.test(char)) {
      arabicLetters++;
      first ??= "rtl";
    } else if (latin.test(char)) {
      latinLetters++;
      first ??= "ltr";
    } else {
      otherLetters++;
      first ??= "ltr";
    }
  }
  const groups = Number(arabicLetters > 0) + Number(latinLetters > 0) + Number(otherLetters > 0);
  const kind = groups > 1 ? "mixed" : arabicLetters ? "arabic" : latinLetters ? "latin" : "unknown";
  return { kind, direction: first ?? "ltr", arabicLetters, latinLetters, otherLetters };
}

/** Words are letter/number runs; internal apostrophes and join controls are retained. */
export function getStatistics(text: string): Statistics {
  const words =
    text.match(
      /[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:['’\u200c\u200d][\p{L}\p{N}][\p{L}\p{M}\p{N}]*)*/gu,
    )?.length ?? 0;
  // An intentionally approximate punctuation-based count; decimal points are not boundaries.
  const sentenceParts = text.replace(/(?<=\p{N})\.(?=\p{N})/gu, "\u0000").split(/[.!?؟۔…]+/u);
  const sentences = sentenceParts.filter((part) => /[\p{L}\p{N}]/u.test(part)).length;
  let characters = 0;
  for (const _ of graphemes.segment(text)) characters++;
  return {
    words,
    characters,
    codePoints: Array.from(text).length,
    sentences,
    lines: text ? text.split(/\r\n|\r|\n/u).length : 0,
  };
}

const boolKeys = [
  "kurdishVariants",
  "collapseSpaces",
  "trimLines",
  "normalizeLineEndings",
  "punctuationSpacing",
  "removeTatweel",
  "removeControls",
] as const;
const keys = new Set<string>(["language", "operation", "direction", ...boolKeys]);
/** Shared strict validation for library callers and JSON API requests. */
export function validateOptions(value: unknown): Options {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new TypeError("Options must be an object.");
  const options = value as Record<string, unknown>;
  for (const key of Object.keys(options))
    if (!keys.has(key)) throw new TypeError(`Unknown option: ${key}.`);
  if (
    options.language !== undefined &&
    !["sorani", "kurmanji", "unicode"].includes(String(options.language))
  )
    throw new TypeError("Choose sorani, kurmanji, or unicode.");
  if (
    options.operation !== undefined &&
    !["normalize", "clean", "transliterate"].includes(String(options.operation))
  )
    throw new TypeError("Choose normalize, clean, or transliterate.");
  if (
    options.direction !== undefined &&
    !["arabic-to-latin", "latin-to-arabic"].includes(String(options.direction))
  )
    throw new TypeError("Choose arabic-to-latin or latin-to-arabic.");
  for (const key of boolKeys)
    if (options[key] !== undefined && typeof options[key] !== "boolean")
      throw new TypeError(`${key} must be a boolean.`);
  return options as Options;
}

const soraniVariants: Record<string, string> = { ك: "ک", ي: "ی" };
const arabicToLatin: Record<string, string> = {
  ا: "a",
  ب: "b",
  پ: "p",
  ت: "t",
  ج: "c",
  چ: "ç",
  ح: "ḥ",
  خ: "x",
  د: "d",
  ر: "r",
  ڕ: "ř",
  ز: "z",
  ژ: "j",
  س: "s",
  ش: "ş",
  ع: "ʿ",
  غ: "ẍ",
  ف: "f",
  ڤ: "v",
  ق: "q",
  ک: "k",
  ك: "k",
  گ: "g",
  ل: "l",
  ڵ: "ł",
  م: "m",
  ن: "n",
  ه: "h",
  ە: "e",
  ۆ: "o",
  ێ: "ê",
};
const latinToArabic: Record<string, string> = {
  a: "ا",
  b: "ب",
  c: "ج",
  ç: "چ",
  d: "د",
  e: "ە",
  ê: "ێ",
  f: "ف",
  g: "گ",
  h: "ه",
  ḥ: "ح",
  i: "",
  î: "ی",
  j: "ژ",
  k: "ک",
  l: "ل",
  ł: "ڵ",
  m: "م",
  n: "ن",
  o: "ۆ",
  p: "پ",
  q: "ق",
  r: "ر",
  ř: "ڕ",
  s: "س",
  ş: "ش",
  t: "ت",
  u: "و",
  û: "وو",
  v: "ڤ",
  w: "و",
  x: "خ",
  ẍ: "غ",
  y: "ی",
  z: "ز",
  ʿ: "ع",
};

export function processText(original: string, inputOptions: Options = {}): Result {
  if (typeof original !== "string") throw new TypeError("Text must be a string.");
  if (original.length > MAX_TEXT_LENGTH)
    throw new RangeError(
      `Text exceeds ${MAX_TEXT_LENGTH.toLocaleString("en")} UTF-16 code units. Split it into smaller passages.`,
    );
  // Reject unpaired surrogates rather than silently repairing malformed Unicode.
  if (!original.isWellFormed()) throw new TypeError("Text contains an unpaired Unicode surrogate.");
  const options = validateOptions(inputOptions);
  const language = options.language ?? "unicode";
  const operation = options.operation ?? "normalize";
  if (operation === "transliterate" && language === "unicode")
    throw new TypeError("Select Sorani or Kurmanji for experimental transliteration.");
  if (operation === "transliterate" && !options.direction)
    throw new TypeError("Choose a transliteration direction explicitly.");
  const script = detectScript(original);
  const changes: Change[] = [];
  const warnings: string[] = [];
  let text = original;
  function replace(
    rule: string,
    label: string,
    pattern: RegExp,
    replacement: (match: string) => string,
  ) {
    const report: Change = { rule, label, count: 0, examples: [] };
    text = text.replace(pattern, (match) => {
      const after = replacement(match);
      if (after !== match) {
        report.count++;
        if (
          report.examples.length < 4 &&
          !report.examples.some((e) => e.before === match && e.after === after)
        )
          report.examples.push({ before: match, after });
      }
      return after;
    });
    if (report.count) changes.push(report);
  }
  // NFC preserves canonical equivalence; NFKC is deliberately not applied globally.
  const nfc: Change = {
    rule: "unicode-nfc",
    label: "Compose canonically equivalent Unicode characters (NFC)",
    count: 0,
    examples: [],
  };
  const normalized = text.normalize("NFC");
  if (normalized !== text) {
    for (const { segment } of graphemes.segment(text)) {
      const after = segment.normalize("NFC");
      if (segment !== after) {
        nfc.count++;
        if (nfc.examples.length < 4) nfc.examples.push({ before: segment, after });
      }
    }
    text = normalized;
  }
  if (nfc.count) changes.push(nfc);
  if (operation === "normalize" && language === "sorani" && options.kurdishVariants !== false) {
    replace("sorani-kaf", "Arabic kaf → Kurdish kaf", /ك/gu, (m) => soraniVariants[m]);
    replace("sorani-yeh", "Arabic yeh → Kurdish yeh", /ي/gu, (m) => soraniVariants[m]);
    if (script.arabicLetters)
      warnings.push(
        "Sorani character rules also affect Arabic quotations. Choose Unicode only to preserve their spelling.",
      );
  }
  if (/[\uFB50-\uFDFF\uFE70-\uFEFC]/u.test(original))
    warnings.push(
      "Arabic presentation forms detected and preserved. Legacy font conversion is outside this release.",
    );
  if (/[\u200b\u200e\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/u.test(original))
    warnings.push(
      "Invisible formatting characters detected. They are preserved unless you explicitly remove formatting controls in Clean.",
    );
  if (operation === "clean") {
    if (options.normalizeLineEndings !== false)
      replace("line-endings", "Standardize line endings to LF", /\r\n|\r/gu, () => "\n");
    if (options.collapseSpaces !== false)
      replace(
        "horizontal-spaces",
        "Collapse repeated ordinary spaces and tabs",
        /[ \t]+/gu,
        () => " ",
      );
    if (options.trimLines === true)
      replace(
        "trim-lines",
        "Trim ordinary spaces and tabs at line edges",
        /^[ \t]+|[ \t]+$/gmu,
        () => "",
      );
    if (options.punctuationSpacing === true) {
      replace(
        "punctuation-spacing",
        "Remove ordinary spaces before selected punctuation",
        /[ \t]+(?=[,،;؛!?؟])/gu,
        () => "",
      );
      warnings.push(
        "Punctuation spacing is a formatting choice. Review code, URLs, and quoted passages before using the result.",
      );
    }
    if (options.removeTatweel === true)
      replace("tatweel", "Remove Arabic elongation marks", /ـ/gu, () => "");
    if (options.removeControls === true) {
      replace(
        "format-controls",
        "Remove selected invisible formatting controls",
        /[\u200b\u200e\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/gu,
        () => "",
      );
      warnings.push(
        "Formatting control removal can change direction and line wrapping. Joiners, non-joiners, emoji, and non-breaking spaces are retained.",
      );
    }
  }
  if (operation === "transliterate") {
    warnings.push(
      "Experimental script conversion, not translation. Sorani stays Sorani; Kurmanji stays Kurmanji. Names and non-Kurdish passages need review.",
    );
    if (options.direction === "arabic-to-latin") {
      warnings.push(
        "Annotated draft: {w/u} and {y/î} mark unresolved letters. Unwritten short i is not reconstructed; output is not a pronunciation guide.",
      );
      replace(
        "transliteration",
        "Arabic → Latin annotated draft",
        /[\p{Script_Extensions=Arabic}\p{M}]+/gu,
        (word) => {
          const chars = Array.from(word);
          let result = "";
          for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            if (c === "و" && chars[i + 1] === "و") {
              result += "û";
              i++;
            } else if (c === "و") result += "{w/u}";
            else if (c === "ی" || c === "ي") result += "{y/î}";
            else if (c === "ئ" && i === 0 && /[اەێۆویي]/u.test(chars[i + 1] ?? "")) {
              /* vowel carrier */
            } else result += arabicToLatin[c] ?? c;
          }
          return result;
        },
      );
      if (detectScript(text).arabicLetters)
        warnings.push(
          "Unmapped Arabic-script characters remain in the draft; they were not guessed or deleted.",
        );
    } else {
      warnings.push(
        "Latin → Arabic loses capitalization, short i, and distinctions between w/u and y/î. Round-trip conversion is not guaranteed. Uses Sorani-style Arabic spelling for either selected variety.",
      );
      replace(
        "transliteration",
        "Latin → Arabic draft (capitalization and short i are lost)",
        /[\p{Script_Extensions=Latin}\p{M}ʿ]+/gu,
        (word) => {
          const lower = word.toLowerCase();
          const converted = Array.from(lower, (c) => latinToArabic[c] ?? c).join("");
          return /^[aeêouûî]/u.test(lower) ? "ئ" + converted : converted;
        },
      );
      if (detectScript(text).latinLetters)
        warnings.push(
          "Unmapped Latin characters remain in the draft; they were not guessed or deleted.",
        );
    }
  }
  if (script.kind === "mixed")
    warnings.push(
      "Mixed scripts detected. Script detection does not identify the language of individual passages.",
    );
  return {
    original,
    text,
    language,
    operation,
    script,
    outputScript: detectScript(text),
    statistics: getStatistics(text),
    changes,
    warnings,
    experimental: operation === "transliterate",
    version: VERSION,
  };
}
