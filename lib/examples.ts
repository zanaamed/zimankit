import type { Language, Operation } from "zimankit";
export function exampleFor(language: Language, operation: Operation): string {
  if (language === "kurmanji")
    return operation === "clean"
      ? "Silav!   Ev amûreke ji bo nivîsa Kurdî ye.\n\n  Em bi hev re dinivîsin.  "
      : "Silav! Ev amu\u0302reke ji bo nivîsa Kurdi\u0302 ye.\nEm bi hev re dinivîsin.";
  if (language === "unicode") return "Ç / C\u0327   ê / e\u0302\nسڵاو · Silav · 👩‍💻";
  return operation === "clean"
    ? "سڵاو،   ئەمە دەقێکی کوردییە.\r\n\r\n  زیمانکیت بۆ هەمووانە ؛ یەک ئامراز بۆ دەقی کوردی.  "
    : "سڵاو، ئەمە دەقێكی كوردییە.\nزیمانكیت بۆ هەمووانە؛ يەك ئامراز بۆ دەقی کوردی.";
}
