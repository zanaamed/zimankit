import { describe, expect, it } from "vitest";
import {
  detectScript,
  getStatistics,
  processText,
  MAX_TEXT_LENGTH,
} from "../packages/core/src/index";

describe("Unicode and Kurdish normalization", () => {
  it("composes Kurmanji diacritics without removing accents or changing case", () => {
    const result = processText("C\u0327 e\u0302 i\u0302 u\u0302 S\u0327", { language: "kurmanji" });
    expect(result.text).toBe("Ç ê î û Ş");
    expect(result.changes[0].count).toBe(5);
  });
  it("uses Unicode-only by default and requires an explicit Sorani profile", () => {
    expect(processText("كوردی يەك").text).toBe("كوردی يەك");
    const result = processText("كوردی يەك", { language: "sorani" });
    expect(result.text).toBe("کوردی یەک");
    expect(result.original).toBe("كوردی يەك");
    expect(result.changes.map((c) => c.count)).toEqual([2, 1]);
    expect(result.warnings.join(" ")).toContain("quotations");
  });
  it("can disable Kurdish variant folding", () => {
    expect(processText("كي", { language: "sorani", kurdishVariants: false }).text).toBe("كي");
  });
  it("preserves distinct letters, digits, diacritics and presentation forms", () => {
    const text = "ه ە ر ڕ ل ڵ و وو ی ێ ى ة ؤ ح ع ١٢٣ ۱۲۳ ﮎ";
    expect(processText(text, { language: "sorani" }).text).toBe(text);
    expect(processText(text).warnings.join(" ")).toContain("presentation forms");
  });
  it("is idempotent for stable operations", () => {
    for (const operation of ["normalize", "clean"] as const) {
      const options = {
        operation,
        language: "sorani" as const,
        trimLines: true,
        punctuationSpacing: true,
      };
      const once = processText("  كوردی   يەك ،\r\nC\u0327  ", options).text;
      expect(processText(once, options).text).toBe(once);
    }
  });
  it("does not use broad compatibility normalization", () => {
    expect(processText("① ﬁ ²").text).toBe("① ﬁ ²");
  });
});

describe("cleaning", () => {
  it("preserves paragraphs, joiners, emoji and nonbreaking spaces", () => {
    const result = processText("سڵاو   کوردستان\r\n\r\nدە\u200cنووسم 👩‍💻\u00a0x", {
      operation: "clean",
    });
    expect(result.text).toBe("سڵاو کوردستان\n\nدە\u200cنووسم 👩‍💻\u00a0x");
  });
  it("preserves invisible controls unless explicitly selected", () => {
    const text = "\u200fسڵاو\u200b\ufeff\u200c\u200d";
    expect(processText(text, { operation: "clean" }).text).toBe(text);
    const removed = processText(text, { operation: "clean", removeControls: true });
    expect(removed.text).toBe("سڵاو\u200c\u200d");
    expect(removed.changes[0].count).toBe(3);
  });
  it("never strips diacritics or elongation by default", () => {
    expect(processText("سـڵاوَ", { operation: "clean" }).text).toBe("سـڵاوَ");
    expect(processText("سـڵاوَ", { operation: "clean", removeTatweel: true }).text).toBe("سڵاوَ");
  });
  it("keeps decimal numbers, URLs and punctuation contents intact", () => {
    const text = "3.14 https://example.com/a?q=2  ،";
    expect(processText(text, { operation: "clean", punctuationSpacing: true }).text).toBe(
      "3.14 https://example.com/a?q=2،",
    );
  });
});

describe("script and statistics", () => {
  it("detects scripts without assuming language", () => {
    expect(detectScript("العربية").kind).toBe("arabic");
    expect(detectScript("English").kind).toBe("latin");
    expect(detectScript("سڵاو hello").kind).toBe("mixed");
    expect(detectScript("Привет hello").kind).toBe("mixed");
    expect(detectScript("١٢٣ 123 👩‍💻").kind).toBe("unknown");
  });
  it("uses the first strong letter for mixed-text direction", () => {
    expect(detectScript("123 سڵاو hello").direction).toBe("rtl");
    expect(detectScript("123 hello سڵاو").direction).toBe("ltr");
  });
  it("counts graphemes, not UTF-16 length", () => {
    expect(getStatistics("👩‍💻")).toMatchObject({ characters: 1, codePoints: 3, words: 0 });
    expect(getStatistics("e\u0302").characters).toBe(1);
  });
  it("defines empty input, word joins and approximate sentences", () => {
    expect(getStatistics("")).toEqual({
      words: 0,
      characters: 0,
      codePoints: 0,
      sentences: 0,
      lines: 0,
    });
    expect(getStatistics("دە\u200cنووسم").words).toBe(1);
    expect(getStatistics("سڵاو! Tu çawa yî؟ 3.14.")).toMatchObject({ words: 6, sentences: 3 });
  });
});

describe("experimental transliteration", () => {
  const arabic = {
    operation: "transliterate",
    language: "sorani",
    direction: "arabic-to-latin",
  } as const;
  const latin = {
    operation: "transliterate",
    language: "kurmanji",
    direction: "latin-to-arabic",
  } as const;
  it("marks ambiguous letters instead of pretending to resolve them", () => {
    const result = processText("کوردی", arabic);
    expect(result.text).toBe("k{w/u}rd{y/î}");
    expect(result.experimental).toBe(true);
    expect(result.warnings.join(" ")).toContain("short i");
  });
  it("handles explicit vowels and distinguishes Sorani consonants", () => {
    expect(processText("ئاسۆ سڵاو ڕێگا وو", arabic).text).toBe("aso sła{w/u} řêga û");
  });
  it("preserves unknown characters", () => {
    expect(processText("ث ة", arabic).text).toBe("ث ة");
    expect(processText("é", latin).text).toBe("é");
  });
  it("reports lossy Latin conversion and handles initial vowels", () => {
    const result = processText("Kurdî agir êvar", latin);
    expect(result.text).toBe("کوردی ئاگر ئێڤار");
    expect(result.warnings.join(" ")).toContain("capitalization");
  });
  it("requires an explicit language and direction", () => {
    expect(() => processText("text", { operation: "transliterate" })).toThrow("Select Sorani");
    expect(() => processText("text", { operation: "transliterate", language: "sorani" })).toThrow(
      "direction",
    );
  });
});

describe("validation", () => {
  it("rejects oversized input without truncating", () => {
    expect(() => processText("x".repeat(MAX_TEXT_LENGTH + 1))).toThrow(RangeError);
    expect(processText("x".repeat(MAX_TEXT_LENGTH)).text.length).toBe(MAX_TEXT_LENGTH);
  });
  it("rejects malformed Unicode and unexpected options", () => {
    expect(() => processText("\ud800")).toThrow("surrogate");
    expect(() => processText("x", { language: "english" } as never)).toThrow("Choose sorani");
    expect(() => processText("x", { trimLines: "false" } as never)).toThrow("boolean");
    expect(() => processText("x", { typo: true } as never)).toThrow("Unknown option");
  });
});
