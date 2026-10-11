import { DOCUMENT_LIMIT, type Dialect } from "./text";
export function download(data: BlobPart, filename: string, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function safeName(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[^\p{L}\p{N} _-]/gu, "_")
      .slice(0, 100) || "document"
  );
}
export async function readDocument(file: File): Promise<string> {
  if (file.size > 10_000_000) throw new Error(`${file.name}: maximum file size is 10 MB.`);
  let text: string;
  if (/\.docx$/i.test(file.name)) {
    const { unzipSync, strFromU8 } = await import("fflate");
    const bytes = new Uint8Array(await file.arrayBuffer());
    let tooLarge = false;
    const files = unzipSync(bytes, {
      filter: (entry) => {
        if (entry.name !== "word/document.xml") return false;
        if (entry.originalSize > 5_000_000) {
          tooLarge = true;
          return false;
        }
        return true;
      },
    });
    if (tooLarge) throw new Error("This Word document expands beyond the 5 MB text limit.");
    if (!files["word/document.xml"]) throw new Error("This file is not a readable Word document.");
    const xml = new DOMParser().parseFromString(
      strFromU8(files["word/document.xml"]),
      "application/xml",
    );
    if (xml.getElementsByTagName("parsererror").length)
      throw new Error("This Word document contains invalid text data.");
    const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    text = Array.from(xml.getElementsByTagNameNS(ns, "p"))
      .map((p) => {
        let value = "";
        const walk = (node: Element) => {
          if (node.namespaceURI === ns && node.localName === "t") value += node.textContent ?? "";
          else if (node.namespaceURI === ns && ["br", "cr"].includes(node.localName)) value += "\n";
          else if (node.namespaceURI === ns && node.localName === "tab") value += "\t";
          else for (const child of node.children) walk(child);
        };
        walk(p);
        return value;
      })
      .join("\n");
  } else if (/\.(txt|md)$/i.test(file.name)) {
    text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } else throw new Error("Choose a UTF-8 .txt, .md, or .docx file.");
  if (text.length > DOCUMENT_LIMIT)
    throw new Error(
      `${file.name}: maximum document length is 100,000 characters. Nothing was imported.`,
    );
  return text;
}
export async function exportDocx(text: string, title: string, dialect: Dialect) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");
  const rtl = dialect === "sorani";
  const doc = new Document({
    title,
    creator: "ZimanKit",
    sections: [
      {
        children: text.split("\n").map(
          (line) =>
            new Paragraph({
              bidirectional: rtl,
              alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: line,
                  rightToLeft: rtl,
                  font: rtl ? "Arial" : "Calibri",
                  size: 24,
                }),
              ],
            }),
        ),
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  download(
    blob,
    safeName(title) + ".docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
}
export async function exportZip(files: { name: string; text: string }[]) {
  const { zip, strToU8 } = await import("fflate");
  const entries = Object.fromEntries(files.map((f) => [f.name, strToU8(f.text)]));
  const bytes = await new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) =>
    zip(entries, { level: 6 }, (error, result) =>
      error ? reject(error) : resolve(result as Uint8Array<ArrayBuffer>),
    ),
  );
  download(bytes, "zimankit-documents.zip", "application/zip");
}
export function csv(rows: (string | number)[][]) {
  return (
    "\ufeff" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let cell = String(value);
            if (/^[=+@\-\t\r]/.test(cell)) cell = "'" + cell;
            return '"' + cell.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}
