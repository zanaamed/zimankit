export type Dialect = "sorani" | "kurmanji";
export const DOCUMENT_LIMIT = 100_000;
export interface Token {
  word: string;
  start: number;
  end: number;
}
export interface Issue {
  word: string;
  occurrences: Token[];
}
export interface Reading {
  stem: string[];
  lemma: string[];
  kind: string[];
  details: string[];
  raw: string;
}
export interface WordInfo {
  word: string;
  recognized: boolean;
  suggestions: string[];
  readings: Reading[];
  stems: string[];
}
export interface Vocabulary {
  word: string;
  count: number;
  forms: string[];
}
export function protectedRanges(text: string): { start: number; end: number }[] {
  return [
    ...text.matchAll(
      /(?:https?:\/\/|www\.)[^\s<>]+|[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}|```[\s\S]*?```|`[^`\n]+`/gu,
    ),
  ].map((m) => ({ start: m.index!, end: m.index! + m[0].length }));
}
export function tokens(text: string, dialect?: Dialect): Token[] {
  const protectedSpans = protectedRanges(text);
  let rangeIndex = 0;
  const result: Token[] = [];
  for (const match of text.matchAll(/[\p{L}\p{M}]+(?:['’\u200c][\p{L}\p{M}]+)*/gu)) {
    const start = match.index!;
    while (rangeIndex < protectedSpans.length && protectedSpans[rangeIndex].end <= start)
      rangeIndex++;
    if (protectedSpans[rangeIndex] && protectedSpans[rangeIndex].start < start + match[0].length)
      continue;
    const word = match[0];
    if (dialect === "sorani" && !/^[\p{Script_Extensions=Arabic}\p{M}\u200c]+$/u.test(word))
      continue;
    if (dialect === "kurmanji" && !/^[\p{Script_Extensions=Latin}\p{M}'’]+$/u.test(word)) continue;
    result.push({ word, start, end: start + word.length });
  }
  return result;
}
export function wordKey(word: string, dialect: Dialect) {
  const normalized = word.normalize("NFC");
  return dialect === "kurmanji" ? normalized.toLocaleLowerCase("ku") : normalized;
}
export function replaceOccurrences(
  text: string,
  occurrences: Token[],
  replacement: string,
): string {
  for (const token of [...occurrences].sort((a, b) => b.start - a.start)) {
    if (text.slice(token.start, token.end) !== token.word)
      throw new Error("The text changed. Review the new result first.");
    text = text.slice(0, token.start) + replacement + text.slice(token.end);
  }
  return text;
}
export function sentences(text: string): string[] {
  return [...new Intl.Segmenter("ku", { granularity: "sentence" }).segment(text)]
    .map((s) => s.segment.trim())
    .filter(Boolean);
}
