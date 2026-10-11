// ZimanKit's browser adapter. Dictionaries retain their CC BY-SA 4.0 license.
import { createHunspellFromStrings } from "./vendor/hunspell/dist/Hunspell.js";
let engine;
let language;
let stops = new Set();
let lastCheck = 0;
let queue = Promise.resolve();
const paths = { sorani: "ckb-Arab", kurmanji: "kmr-Latn" };
async function resource(path) {
  const response = await fetch(path);
  if (!response.ok)
    throw new Error("Language files could not be loaded. Check your connection and retry.");
  return response.text();
}
async function load(dialect) {
  if (!paths[dialect]) throw new Error("Select Sorani or Kurmanji.");
  if (engine && language === dialect) return;
  const [aff, dic, stopwords] = await Promise.all([
    resource(`/dictionaries/${paths[dialect]}.aff`),
    resource(`/dictionaries/${paths[dialect]}.dic`),
    resource("/klpt/stopwords.json"),
  ]);
  engine?.dispose();
  engine = await createHunspellFromStrings(aff, dic);
  language = dialect;
  const data = JSON.parse(stopwords);
  stops = new Set(
    data[dialect === "sorani" ? "Sorani" : "Kurmanji"][dialect === "sorani" ? "Arabic" : "Latin"],
  );
}
const key = (word) =>
  language === "kurmanji" ? word.normalize("NFC").toLocaleLowerCase("ku") : word.normalize("NFC");
const recognized = (word) => engine.testSpelling(word.normalize("NFC"));
function readings(word) {
  return engine.analyzeWord(word.normalize("NFC")).map((raw) => {
    const values = (name) =>
      [...raw.matchAll(new RegExp(`(?:^|\\s)${name}:([^\\s]+)`, "g"))]
        .flatMap((m) => m[1].replace(/[VIT]:lf$/u, "").split("_"))
        .filter(Boolean);
    const bases = [...raw.matchAll(/(?:^|\s)([^\s:]+):ts(?:\s|$)/gu)].map((m) => m[1]);
    return {
      raw,
      stem: values("st"),
      lemma: values("lem").length ? values("lem") : bases,
      kind: values("po"),
      details: [...values("is"), ...values("ds")],
    };
  });
}
async function handle(message) {
  const { id, type, dialect } = message;
  await load(dialect);
  if (type === "load") return { ready: true };
  if (type === "word") {
    const word = message.word;
    if (typeof word !== "string" || word.length > 80)
      throw new Error("Choose a word of up to 80 characters.");
    return {
      word,
      recognized: recognized(word),
      suggestions: engine.getSpellingSuggestions(word).slice(0, 8),
      readings: readings(word),
      stems: engine.stemWord(word),
    };
  }
  const items = message.tokens;
  if (!Array.isArray(items) || items.length > 50000)
    throw new Error("This document is too large. Split it into smaller files.");
  const groups = new Map();
  for (const token of items) {
    if (!groups.has(token.word)) groups.set(token.word, []);
    groups.get(token.word).push(token);
  }
  if (type === "check") {
    const accepted = new Set(message.accepted.map(key));
    const issues = [];
    let processed = 0;
    for (const [word, occurrences] of groups) {
      if (lastCheck !== id) return { cancelled: true };
      if (!accepted.has(key(word)) && (word.length > 80 || !recognized(word)))
        issues.push({ word, occurrences });
      if (++processed % 100 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return { issues, checked: items.length, unique: groups.size };
  }
  if (type === "vocabulary") {
    const vocabulary = new Map();
    let processed = 0;
    for (const [word, occurrences] of groups) {
      if (message.hideCommon && stops.has(key(word))) continue;
      const result = word.length <= 80 && message.groupForms ? readings(word) : [];
      const lemmas = [...new Set(result.flatMap((r) => r.lemma))];
      // Only group an unambiguous dictionary form. Ambiguous words stay separate.
      const base = lemmas.length === 1 ? lemmas[0] : key(word);
      const item = vocabulary.get(base) || { word: base, count: 0, forms: [] };
      item.count += occurrences.length;
      item.forms.push(word);
      vocabulary.set(base, item);
      if (++processed % 100 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return [...vocabulary.values()].sort(
      (a, b) => b.count - a.count || a.word.localeCompare(b.word),
    );
  }
  throw new Error("Unknown language operation.");
}
self.onmessage = ({ data }) => {
  if (data.type === "check") lastCheck = data.id;
  queue = queue.then(async () => {
    if (data.type === "check" && data.id !== lastCheck) {
      self.postMessage({ id: data.id, result: { cancelled: true } });
      return;
    }
    try {
      self.postMessage({ id: data.id, result: await handle(data) });
    } catch (error) {
      self.postMessage({
        id: data.id,
        error: error instanceof Error ? error.message : "Language processing failed.",
      });
    }
  });
};
