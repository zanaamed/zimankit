import { describe, expect, it } from "vitest";
import { cleanupEdits, applyEdits, defaultCleanup } from "../lib/workbench/cleanup";
import { tokens, replaceOccurrences, wordKey } from "../lib/workbench/text";
import { csv } from "../lib/workbench/files";

describe("Kurdish writing workflow", () => {
  it("keeps offsets through emoji and skips URLs, email, and code", () => {
    const text = "👩‍💻 سڵاو https://example.com/کوردی test@example.com `کوردی` کوردی";
    const result = tokens(text, "sorani");
    expect(result.map((t) => t.word)).toEqual(["سڵاو", "کوردی"]);
    for (const token of result) expect(text.slice(token.start, token.end)).toBe(token.word);
  });
  it("preserves foreign-script text while selecting Kurdish words", () => {
    expect(tokens("سڵاو Silav English", "sorani").map((t) => t.word)).toEqual(["سڵاو"]);
    expect(tokens("سڵاو Silav English", "kurmanji").map((t) => t.word)).toEqual([
      "Silav",
      "English",
    ]);
  });
  it("replaces exact word occurrences, including repeated words, without replacing substrings", () => {
    const text = "سڵاو سڵاوە سڵاو";
    const occurrences = tokens(text).filter((t) => t.word === "سڵاو");
    expect(replaceOccurrences(text, occurrences, "کوردی")).toBe("کوردی سڵاوە کوردی");
    expect(() => replaceOccurrences("modified", occurrences, "x")).toThrow("text changed");
  });
  it("uses KLPT character and digit data while preserving links and paragraphs", () => {
    const text = "كوردی  ٢٠٢٦ !\nhttps://example.com/كوردی";
    const options = { ...defaultCleanup, digits: "Latin" as const };
    const edits = cleanupEdits(text, "sorani", options);
    expect(applyEdits(text, edits)).toBe("کوردی 2026!\nhttps://example.com/كوردی");
    expect(applyEdits(text, [edits[0]])).toBe("کوردی  ٢٠٢٦ !\nhttps://example.com/كوردی");
  });
  it("only applies broader writing conventions when selected", () => {
    expect(applyEdits("راستە", cleanupEdits("راستە", "sorani", defaultCleanup))).toBe("راستە");
    expect(
      applyEdits(
        "راستە",
        cleanupEdits("راستە", "sorani", { ...defaultCleanup, standardize: true }),
      ),
    ).toBe("ڕاستە");
  });
  it("does not fold distinct Kurdish letters, and supports personal words in different case", () => {
    expect(wordKey("ÇÊÎÛŞ", "kurmanji")).toBe("çêîûş");
    expect(wordKey("ڕەڵ", "sorani")).toBe("ڕەڵ");
  });
  it("neutralizes spreadsheet formulas and quotes CSV fields", () => {
    expect(csv([["=cmd", 'a"b', 2]])).toBe('\ufeff"\'=cmd","a""b","2"');
  });
});
