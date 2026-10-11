import rules from "../../public/klpt/preprocess_map.json";
import { protectedRanges, tokens, type Dialect } from "./text";

export interface CleanupOptions {
  letters: boolean;
  spaces: boolean;
  punctuation: boolean;
  standardize: boolean;
  digits: "keep" | "Latin" | "Arabic" | "Farsi";
}
export const defaultCleanup: CleanupOptions = {
  letters: true,
  spaces: true,
  punctuation: true,
  standardize: false,
  digits: "keep",
};
export interface Edit {
  start: number;
  end: number;
  before: string;
  after: string;
  reason: string;
}

// KLPT's data is used unchanged under CC BY-SA 4.0. This runner is independent.
// The broader normalizer is deliberately opt-in through reviewed per-word edits.
function mapped(text: string, map: Record<string, string>) {
  for (const [pattern, value] of Object.entries(map)) {
    text = text.replace(new RegExp(pattern, "gu"), value.replace(/\\(\d)/g, "$$$1"));
  }
  return text;
}
export function cleanupEdits(text: string, dialect: Dialect, options: CleanupOptions): Edit[] {
  const edits: Edit[] = [];
  const protectedSpans = protectedRanges(text);
  const allowed = (start: number, end: number) =>
    !protectedSpans.some((r) => start < r.end && end > r.start);
  for (const token of tokens(text, dialect)) {
    let after = token.word.normalize("NFC");
    if (options.letters) {
      if (dialect === "sorani") after = mapped(after, rules.normalizer.universal.Arabic);
      else after = mapped(after, rules.normalizer.Kurmanji.Latin);
    }
    if (options.standardize) {
      const map =
        dialect === "sorani" ? rules.standardizer.Sorani.Arabic : rules.standardizer.Kurmanji.Latin;
      after = mapped(" " + after + " ", map).trim();
    }
    if (after !== token.word)
      edits.push({
        ...token,
        before: token.word,
        after,
        reason: options.standardize ? "Kurdish writing conventions" : "Consistent Kurdish letters",
      });
  }
  function add(pattern: RegExp, replacement: (value: string) => string, reason: string) {
    for (const match of text.matchAll(pattern)) {
      const start = match.index!;
      const end = start + match[0].length;
      const after = replacement(match[0]);
      if (
        after !== match[0] &&
        allowed(start, end) &&
        !edits.some((e) => start < e.end && end > e.start)
      )
        edits.push({ start, end, before: match[0], after, reason });
    }
  }
  if (options.punctuation) add(/[ \t]+(?=[.,،:;؛!?؟])/gu, () => "", "Space before punctuation");
  if (options.spaces) {
    add(/[ \t]{2,}|\t/gu, () => " ", "Repeated spaces");
    add(/\r\n|\r/gu, () => "\n", "Consistent line endings");
  }
  if (options.digits !== "keep") {
    const map: Record<string, string> = rules.normalizer.universal.numerals[options.digits];
    add(
      /[0-9\u0660-\u0669\u06f0-\u06f9]+/gu,
      (value) => [...value].map((c) => map[c] ?? c).join(""),
      "Number style",
    );
  }
  return edits.sort((a, b) => a.start - b.start);
}
export function applyEdits(text: string, edits: Edit[]) {
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    if (text.slice(edit.start, edit.end) !== edit.before)
      throw new Error("The text changed. Review the new cleanup first.");
    text = text.slice(0, edit.start) + edit.after + text.slice(edit.end);
  }
  return text;
}
