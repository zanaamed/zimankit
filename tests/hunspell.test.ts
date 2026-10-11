import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { createHunspellFromStrings } from "hunspell-wasm";
import manifest from "../public/licenses/resources.json";
import type { WordInfo } from "../lib/workbench/text";

describe("pinned Kurdish language resources", () => {
  it("extracts dictionary forms in the browser worker without continuation flags", async () => {
    const source = await readFile("public/kurdish-worker.js", "utf8");
    const replies: { result: WordInfo; error?: string }[] = [];
    let finish!: () => void;
    const completed = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const worker = {
      onmessage: (_event: { data: Record<string, unknown> }) => {},
      postMessage: (reply: { result: WordInfo; error?: string }) => {
        replies.push(reply);
        if (replies.length === 2) finish();
      },
    };
    const engine = {
      testSpelling: () => true,
      getSpellingSuggestions: () => [],
      stemWord: () => [],
      dispose: () => {},
      analyzeWord: (word: string) => [
        word === "dibêjim"
          ? "V:lf bêj:ts po:verb is:present_stem_transitive_active st:bêj lem:gotinV:lf "
          : "po:noun st:گوڵ گوڵ:ts ەکانم",
      ],
    };
    // Run the actual worker adapter with a fixed engine fixture and local resources.
    runInNewContext(source.replace(/^import .*;\r?\n/m, ""), {
      self: worker,
      createHunspellFromStrings: async () => engine,
      fetch: async () => ({
        ok: true,
        text: async () => JSON.stringify({ Sorani: { Arabic: [] }, Kurmanji: { Latin: [] } }),
      }),
      setTimeout,
    });
    worker.onmessage({ data: { id: 1, type: "word", dialect: "kurmanji", word: "dibêjim" } });
    worker.onmessage({ data: { id: 2, type: "word", dialect: "sorani", word: "گوڵەکانم" } });
    await completed;
    expect(replies.map((reply) => reply.error)).toEqual([undefined, undefined]);
    expect(replies[0].result.readings[0].lemma).toEqual(["gotin"]);
    expect(replies[1].result.readings[0].lemma).toEqual(["گوڵ"]);
  });
  it("retains upstream dictionary and KLPT data byte-for-byte", async () => {
    for (const file of manifest.files) {
      const bytes = await readFile(`public/${file.path}`);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(file.sha256);
    }
  });
  it("checks real Sorani and Kurmanji inflections and suggests a known correction", async () => {
    for (const name of ["ckb-Arab", "kmr-Latn"]) {
      const [aff, dic] = await Promise.all([
        readFile(`public/dictionaries/${name}.aff`, "utf8"),
        readFile(`public/dictionaries/${name}.dic`, "utf8"),
      ]);
      const engine = await createHunspellFromStrings(aff, dic);
      try {
        if (name === "ckb-Arab") {
          expect(engine.testSpelling("گوڵەکانم")).toBe(true);
          expect(engine.testSpelling("سوتاندبووت")).toBe(false);
          expect(engine.getSpellingSuggestions("سوتاندبووت")).toContain("سووتاندبووت");
          expect(engine.analyzeWord("دیتبامن").join(" ")).toContain("lem:دیتن");
        } else {
          expect(engine.testSpelling("Silav")).toBe(true);
          expect(engine.testSpelling("dibêjim")).toBe(true);
          expect(engine.analyzeWord("dibêjim").join(" ")).toContain("lem:gotin");
        }
      } finally {
        engine.dispose();
      }
    }
  }, 20000);
});
