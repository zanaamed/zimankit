"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  FilePlus2,
  Upload,
  Undo2,
  Redo2,
  Search,
  BookOpen,
  SpellCheck,
  ArrowRight,
  X,
  RefreshCw,
} from "lucide-react";
import { detectScript, getStatistics, processText } from "zimankit";
import { LanguageEngine } from "@/lib/workbench/engine";
import {
  DOCUMENT_LIMIT,
  tokens,
  wordKey,
  replaceOccurrences,
  sentences,
  type Dialect,
  type Issue,
  type WordInfo,
  type Vocabulary,
} from "@/lib/workbench/text";
import {
  applyEdits,
  cleanupEdits,
  defaultCleanup,
  type CleanupOptions,
  type Edit,
} from "@/lib/workbench/cleanup";
import {
  csv,
  download,
  exportDocx,
  exportZip,
  readDocument,
  safeName,
} from "@/lib/workbench/files";

type Tab = "spelling" | "cleanup" | "explore" | "analyze" | "convert" | "files" | "dictionary";
type Draft = { id: string; title: string; text: string; dialect: Dialect };
type BatchFile = { name: string; original: string; cleaned: string; edits: Edit[] };
const STORAGE = "zimankit.workspace.v1";
const DICTIONARY = "zimankit.dictionary.v1";
const examples: Record<Dialect, string> = {
  sorani: "سڵاو! کوردی زمانێکی جوانە.\nگوڵەکانم سوتاندبووت.\nلە ساڵی ٢٠٢٦دا  دەنووسین .",
  kurmanji:
    "Silav! Ez bi kurdî dinivîsim.\nEz dibêjim: zimanê me xweş e.\nEv  nivîs ji bo ceribandinê ye. kurdii",
};
const tabs: [Tab, string][] = [
  ["spelling", "Spelling"],
  ["cleanup", "Cleanup"],
  ["explore", "Word explorer"],
  ["analyze", "Text insights"],
  ["convert", "Alphabet"],
  ["files", "Files"],
  ["dictionary", "My words"],
];
const newDraft = (dialect: Dialect): Draft => ({
  id: crypto.randomUUID(),
  title: "Untitled document",
  text: "",
  dialect,
});
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please retry.";
const kindNames: Record<string, string> = {
  noun: "Noun",
  verb: "Verb",
  adj: "Adjective",
  adv: "Adverb",
  propn: "Proper name",
  intj: "Interjection",
  pron: "Pronoun",
  adp: "Preposition",
  conj: "Conjunction",
  fem: "Feminine",
  masc: "Masculine",
};

export function WritingWorkspace() {
  const [drafts, setDrafts] = useState<Draft[]>([
    { id: "initial", title: "Untitled document", text: "", dialect: "sorani" },
  ]);
  const [active, setActive] = useState("initial");
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState("Opening local drafts…");
  const [personal, setPersonal] = useState<Record<Dialect, string[]>>({ sorani: [], kurmanji: [] });
  const [ignored, setIgnored] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("spelling");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [engineState, setEngineState] = useState("Loading Kurdish dictionary…");
  const [engineReady, setEngineReady] = useState(false);
  const [engineVersion, setEngineVersion] = useState(0);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [checkedText, setCheckedText] = useState<string | null>(null);
  const [checkedCount, setCheckedCount] = useState(0);
  const [checking, setChecking] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");
  const [wordInfo, setWordInfo] = useState<WordInfo | null>(null);
  const [wordBusy, setWordBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [cleanup, setCleanup] = useState<CleanupOptions>(defaultCleanup);
  const [undo, setUndo] = useState<string[]>([]);
  const [redo, setRedo] = useState<string[]>([]);
  const [hideCommon, setHideCommon] = useState(true);
  const [groupForms, setGroupForms] = useState(false);
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [dictionaryInput, setDictionaryInput] = useState("");
  const [batch, setBatch] = useState<BatchFile[]>([]);
  const [batchPreview, setBatchPreview] = useState(0);
  const [busy, setBusy] = useState(false);
  const [direction, setDirection] = useState<"arabic-to-latin" | "latin-to-arabic">(
    "arabic-to-latin",
  );
  const [conversion, setConversion] = useState("");
  const [conversionSource, setConversionSource] = useState<string | null>(null);
  const [sessionEdits, setSessionEdits] = useState<
    { before: string; after: string; reason: string }[]
  >([]);
  const engine = useRef<LanguageEngine | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const batchInput = useRef<HTMLInputElement>(null);
  const current = drafts.find((d) => d.id === active) ?? drafts[0];
  const { text, dialect } = current;
  const textRef = useRef(text);
  textRef.current = text;
  const wordRequest = useRef(0);
  const dialectRef = useRef(dialect);
  dialectRef.current = dialect;
  const stats = useMemo(() => getStatistics(text), [text]);
  const textTokens = useMemo(() => tokens(text, dialect), [text, dialect]);
  const edits = useMemo(() => cleanupEdits(text, dialect, cleanup), [text, dialect, cleanup]);
  const accepted = useMemo(() => [...personal[dialect], ...ignored], [personal, dialect, ignored]);
  const visibleIssues = checkedText === text ? issues : [];
  const issue = visibleIssues.find((i) => i.word === selectedWord);
  const filteredVocabulary = vocabulary.filter(
    (v) =>
      !query ||
      [v.word, ...v.forms].some((w) => wordKey(w, dialect).includes(wordKey(query, dialect))),
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) ?? "null");
      if (saved && Array.isArray(saved.drafts)) {
        const valid = saved.drafts
          .filter(
            (d: Draft) =>
              typeof d?.id === "string" &&
              typeof d.title === "string" &&
              typeof d.text === "string" &&
              d.text.length <= DOCUMENT_LIMIT &&
              ["sorani", "kurmanji"].includes(d.dialect),
          )
          .slice(0, 20);
        if (valid.length) {
          setDrafts(valid);
          setActive(valid.some((d: Draft) => d.id === saved.active) ? saved.active : valid[0].id);
        }
      }
      const words = JSON.parse(localStorage.getItem(DICTIONARY) ?? "null");
      if (words)
        setPersonal({
          sorani: Array.isArray(words.sorani)
            ? words.sorani
                .filter((w: unknown) => typeof w === "string" && w.length <= 80)
                .slice(0, 5000)
            : [],
          kurmanji: Array.isArray(words.kurmanji)
            ? words.kurmanji
                .filter((w: unknown) => typeof w === "string" && w.length <= 80)
                .slice(0, 5000)
            : [],
        });
    } catch {
      setError("Saved drafts could not be read. Export your work before closing this page.");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify({ drafts, active }));
      localStorage.setItem(DICTIONARY, JSON.stringify(personal));
      setSaveState("Saved on this device");
    } catch {
      setSaveState("Saving unavailable — download a copy");
    }
  }, [drafts, active, personal, hydrated]);

  useEffect(() => {
    const worker = new LanguageEngine();
    engine.current = worker;
    return () => {
      engine.current = null;
      worker.dispose();
    };
  }, [engineVersion]);

  useEffect(() => {
    let live = true;
    wordRequest.current++;
    setWordBusy(false);
    setEngineReady(false);
    setEngineState("Loading Kurdish dictionary…");
    setIssues([]);
    setCheckedText(null);
    setWordInfo(null);
    setSelectedWord("");
    setIgnored([]);
    setVocabulary([]);
    setAnalysisText(null);
    engine.current
      ?.request("load", dialect)
      .then(() => {
        if (live) {
          setEngineReady(true);
          setEngineState("Dictionary ready · on your device");
        }
      })
      .catch((e) => {
        if (live) setEngineState(message(e));
      });
    return () => {
      live = false;
    };
  }, [dialect, engineVersion]);

  useEffect(() => {
    if (!engineReady || !hydrated) return;
    let live = true;
    setChecking(true);
    const timer = setTimeout(() => {
      engine.current
        ?.request<{ issues: Issue[]; checked: number; cancelled?: boolean }>("check", dialect, {
          tokens: textTokens,
          accepted,
        })
        .then((result) => {
          if (!live || result.cancelled) return;
          setIssues(result.issues);
          setCheckedCount(result.checked);
          setCheckedText(text);
          setChecking(false);
        })
        .catch((e) => {
          if (live) {
            setError(message(e));
            setChecking(false);
          }
        });
    }, 500);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [text, textTokens, dialect, accepted, engineReady, hydrated]);

  function resetReview() {
    wordRequest.current++;
    setWordBusy(false);
    setUndo([]);
    setRedo([]);
    setIgnored([]);
    setSessionEdits([]);
    setSelectedWord("");
    setWordInfo(null);
    setReview(false);
    setConversionSource(null);
    setAnalysisText(null);
  }
  function updateText(next: string, reason?: string) {
    if (next.length > DOCUMENT_LIMIT) {
      setError("Maximum document length is 100,000 characters. Your original text is preserved.");
      return;
    }
    if (next === text) return;
    setUndo((previous) => [...previous.slice(-39), text]);
    setRedo([]);
    setDrafts((previous) => previous.map((d) => (d.id === active ? { ...d, text: next } : d)));
    if (reason)
      setSessionEdits((previous) => [
        ...previous.slice(-19),
        { before: text, after: next, reason },
      ]);
    setError("");
  }
  function travel(back: boolean) {
    const stack = back ? undo : redo;
    const value = stack.at(-1);
    if (value === undefined) return;
    if (back) {
      setUndo(stack.slice(0, -1));
      setRedo((p) => [...p, text]);
    } else {
      setRedo(stack.slice(0, -1));
      setUndo((p) => [...p, text]);
    }
    setDrafts((p) => p.map((d) => (d.id === active ? { ...d, text: value } : d)));
  }
  function openDraft(draft: Draft) {
    if (draft.text.length > DOCUMENT_LIMIT) {
      setError("This draft exceeds 100,000 characters. Download it instead.");
      return false;
    }
    if (drafts.length >= 20) {
      setError("You have 20 local documents. Remove one in Files before importing another.");
      return false;
    }
    setDrafts((p) => [...p, draft]);
    setActive(draft.id);
    resetReview();
    return true;
  }
  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const value = await readDocument(file);
      if (!openDraft({ ...newDraft(dialect), title: safeName(file.name), text: value })) return;
      setNotice(
        /\.docx$/i.test(file.name)
          ? "Imported Word text and paragraphs. Images, tables, and styling are not retained."
          : "Document imported.",
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function inspectWord(word: string, focus = false) {
    if (!word.trim() || !engineReady) return;
    const request = ++wordRequest.current;
    setSelectedWord(word);
    setWordInfo(null);
    setWordBusy(true);
    setError("");
    if (focus) {
      const token = textTokens.find((t) => t.word === word);
      if (token && editor.current) {
        editor.current.focus();
        editor.current.setSelectionRange(token.start, token.end);
      }
    }
    try {
      const info = await engine.current!.request<WordInfo>("word", dialect, { word });
      if (request === wordRequest.current && dialect === dialectRef.current) setWordInfo(info);
    } catch (e) {
      if (request === wordRequest.current) setError(message(e));
    } finally {
      if (request === wordRequest.current) setWordBusy(false);
    }
  }
  function replaceWord(replacement: string, all = false) {
    if (!issue) return;
    updateText(
      replaceOccurrences(
        text,
        all ? issue.occurrences : issue.occurrences.slice(0, 1),
        replacement,
      ),
      `Spelling: ${issue.word} → ${replacement}`,
    );
    setWordInfo(null);
    setSelectedWord("");
    setNotice("Correction applied. Undo is available.");
  }
  function addPersonal(word: string) {
    const value = word.trim().normalize("NFC");
    if (
      !value ||
      value.length > 80 ||
      tokens(value, dialect).length !== 1 ||
      tokens(value, dialect)[0].word !== value
    ) {
      setError("Enter one Kurdish word, up to 80 characters.");
      return;
    }
    if (personal[dialect].length >= 5000) {
      setError("Your personal dictionary is limited to 5,000 words per variety.");
      return;
    }
    setPersonal((p) => ({ ...p, [dialect]: [...new Set([...p[dialect], value])] }));
    setDictionaryInput("");
    setNotice(`Added “${value}” to your ${dialect === "sorani" ? "Sorani" : "Kurmanji"} words.`);
  }
  async function analyze() {
    if (!engineReady) return;
    setAnalysisBusy(true);
    setError("");
    const source = text;
    const variety = dialect;
    try {
      const result = await engine.current!.request<Vocabulary[]>("vocabulary", dialect, {
        tokens: textTokens,
        hideCommon,
        groupForms,
      });
      if (source === textRef.current && variety === dialectRef.current) {
        setVocabulary(result);
        setAnalysisText(source);
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setAnalysisBusy(false);
    }
  }
  async function loadBatch(files: FileList | null) {
    if (!files?.length) return;
    if (files.length > 20) {
      setError("Choose up to 20 files at a time.");
      return;
    }
    setBusy(true);
    setError("");
    const result: BatchFile[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const original = await readDocument(file);
        const changes = cleanupEdits(original, dialect, cleanup);
        result.push({
          name: file.name,
          original,
          edits: changes,
          cleaned: applyEdits(original, changes),
        });
      } catch (e) {
        errors.push(message(e));
      }
    }
    setBatch(result);
    setBatchPreview(0);
    setBusy(false);
    if (errors.length) setError(errors.join(" "));
    if (batchInput.current) batchInput.current.value = "";
  }
  function convert() {
    try {
      // Core's limit is 20,000; split at whitespace to preserve word boundaries.
      const chunks = text.match(/[\s\S]{1,15000}(?:\s|$)|\S{1,15000}/gu) ?? [];
      const result = chunks
        .map(
          (chunk) =>
            processText(chunk, { language: dialect, operation: "transliterate", direction }).text,
        )
        .join("");
      setConversion(result);
      setConversionSource(text);
    } catch (e) {
      setError(message(e));
    }
  }
  const annotated = useMemo(() => {
    const map = new Set(visibleIssues.map((i) => i.word));
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    for (const token of textTokens.slice(0, 3000)) {
      parts.push(text.slice(cursor, token.start));
      parts.push(
        <button
          key={token.start}
          className={map.has(token.word) ? "review-word suspect" : "review-word"}
          onClick={() => {
            setTab(map.has(token.word) ? "spelling" : "explore");
            void inspectWord(token.word);
          }}
          title={map.has(token.word) ? "Check this word" : "Explore this word"}
        >
          {token.word}
        </button>,
      );
      cursor = token.end;
    }
    parts.push(text.slice(cursor));
    return parts;
  }, [text, textTokens, visibleIssues, engineReady, dialect]);

  return (
    <section className="writing-workspace" aria-label="Kurdish writing workspace">
      <div className="document-bar">
        <div className="document-picker">
          <label className="sr-only" htmlFor="document-select">
            Local documents
          </label>
          <select
            id="document-select"
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              resetReview();
            }}
          >
            {drafts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          <button
            className="icon-button"
            aria-label="New document"
            disabled={!hydrated || drafts.length >= 20}
            onClick={() => openDraft(newDraft(dialect))}
          >
            <FilePlus2 size={18} />
          </button>
        </div>
        <div className="document-actions">
          <span className="local-badge">
            <span className="status-dot" /> Private · on your device
          </span>
          <button
            className="button"
            disabled={busy || !hydrated}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={15} /> Import
          </button>
          <button
            className="button primary"
            disabled={!text}
            onClick={() => download(text, safeName(current.title) + ".txt")}
          >
            <Download size={15} /> Export text
          </button>
        </div>
        <input
          className="sr-only"
          ref={fileInput}
          type="file"
          accept=".txt,.md,.docx"
          onChange={(e) => void importFile(e.target.files?.[0])}
        />
      </div>
      <div className="writing-grid">
        <div className="writing-page">
          <div className="writing-meta">
            <label className="sr-only" htmlFor="document-title">
              Document title
            </label>
            <input
              id="document-title"
              className="document-title"
              maxLength={100}
              value={current.title}
              disabled={!hydrated}
              onChange={(e) =>
                setDrafts((p) =>
                  p.map((d) => (d.id === active ? { ...d, title: e.target.value } : d)),
                )
              }
            />
            <label className="sr-only" htmlFor="writing-dialect">
              Kurdish variety
            </label>
            <select
              id="writing-dialect"
              value={dialect}
              disabled={!hydrated}
              onChange={(e) => {
                setDrafts((p) =>
                  p.map((d) =>
                    d.id === active ? { ...d, dialect: e.target.value as Dialect } : d,
                  ),
                );
                resetReview();
              }}
            >
              <option value="sorani">سۆرانی · Sorani</option>
              <option value="kurmanji">Kurmancî · Kurmanji</option>
            </select>
          </div>
          <div className="editor-tools">
            <div className="segmented">
              <button aria-pressed={!review} onClick={() => setReview(false)}>
                Write
              </button>
              <button aria-pressed={review} onClick={() => setReview(true)}>
                Review words
              </button>
            </div>
            <div className="inline-actions">
              <button
                className="icon-button"
                aria-label="Undo"
                disabled={!undo.length}
                onClick={() => travel(true)}
              >
                <Undo2 size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Redo"
                disabled={!redo.length}
                onClick={() => travel(false)}
              >
                <Redo2 size={16} />
              </button>
            </div>
          </div>
          {review ? (
            <div
              className="annotated-text"
              dir={detectScript(text).direction}
              lang={dialect === "sorani" ? "ckb" : "kmr"}
              aria-label="Text with spelling review"
            >
              {text ? (
                annotated
              ) : (
                <span className="muted">Write or import a document to review its words.</span>
              )}
            </div>
          ) : (
            <textarea
              ref={editor}
              id="writing-text"
              className="writing-text"
              aria-label="Kurdish document"
              dir={text ? detectScript(text).direction : dialect === "sorani" ? "rtl" : "ltr"}
              lang={dialect === "sorani" ? "ckb" : "kmr"}
              value={text}
              disabled={!hydrated}
              spellCheck={false}
              placeholder={
                dialect === "sorani" ? "لێرە بە کوردی بنووسە…" : "Li vir bi kurdî binivîse…"
              }
              onChange={(e) => updateText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
                  e.preventDefault();
                  travel(!e.shiftKey);
                }
              }}
            />
          )}
          {!text && (
            <div className="empty-editor">
              <p>Your next Kurdish document starts here.</p>
              <button
                className="text-button"
                disabled={!hydrated}
                onClick={() => updateText(examples[dialect], "Loaded example")}
              >
                Try a {dialect === "sorani" ? "Sorani" : "Kurmanji"} example{" "}
                <ArrowRight size={14} />
              </button>
            </div>
          )}
          <div className="writing-status">
            <span>
              {stats.words.toLocaleString()} words · {stats.characters.toLocaleString()} characters
            </span>
            <span>{saveState}</span>
          </div>
          <p className="writing-hint">
            {review
              ? "Click a word to explore it. Underlined words need review, but may be valid names or regional words."
              : "Spelling checks run as you write. Use Review words to inspect words in context."}
          </p>
          {review && textTokens.length > 3000 && (
            <p className="writing-hint">
              The first 3,000 words are clickable; spelling checks cover the full document.
            </p>
          )}
        </div>
        <aside className="writing-assistant" aria-label="Writing tools">
          <div className="assistant-tabs" aria-label="Choose a tool">
            {tabs.map(([id, label]) => (
              <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="assistant-body">
            {tab === "spelling" && (
              <>
                <div className="panel-heading">
                  <h2>
                    <SpellCheck size={20} /> Spelling review
                  </h2>
                  <span className="count-badge">{visibleIssues.length}</span>
                </div>
                <p className="panel-description">
                  {checking
                    ? "Checking your Kurdish text…"
                    : checkedText === text
                      ? `${checkedCount} ${dialect === "sorani" ? "Arabic-script" : "Latin-script"} words checked. Choose a word to review.`
                      : "Your dictionary will load automatically."}
                </p>
                <p className="engine-status" role="status">
                  {engineState}{" "}
                  {!engineReady && (
                    <button className="text-button" onClick={() => setEngineVersion((v) => v + 1)}>
                      <RefreshCw size={12} /> Retry
                    </button>
                  )}
                </p>
                {dialect === "sorani" ? (
                  <p className="fine-print">
                    Arabic-script quotations are also checked. Ignore them or switch to a selected
                    Kurdish passage.
                  </p>
                ) : (
                  <p className="fine-print">
                    Latin-script English passages may also be flagged. Links, emails, and backtick
                    code are skipped.
                  </p>
                )}
                {visibleIssues.length > 0 && (
                  <div className="issue-list">
                    {visibleIssues.slice(0, 200).map((item) => (
                      <button
                        className={
                          selectedWord === item.word ? "issue-item selected" : "issue-item"
                        }
                        key={item.word}
                        onClick={() => void inspectWord(item.word, !review)}
                      >
                        <bdi>{item.word}</bdi>
                        <span>
                          {item.occurrences.length > 1
                            ? `${item.occurrences.length} occurrences`
                            : "Check word"}{" "}
                          <ArrowRight size={12} />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {visibleIssues.length > 200 && (
                  <p className="fine-print">
                    Showing the first 200 of {visibleIssues.length} words. Resolve these to reveal
                    more.
                  </p>
                )}
                {!checking && checkedText === text && !visibleIssues.length && (
                  <div className="panel-empty">
                    <Check size={25} />
                    <p>
                      {checkedCount
                        ? "No unrecognized words in this check."
                        : "Start writing to check your spelling."}
                    </p>
                    <small>Spelling checks do not assess sentence grammar.</small>
                  </div>
                )}
                {wordBusy && (
                  <p className="panel-description" role="status">
                    Finding suggestions…
                  </p>
                )}
                {wordInfo && issue && (
                  <div className="word-detail">
                    <h3>
                      <bdi>{selectedWord}</bdi>
                    </h3>
                    <p className="fine-print">
                      Suggestions from Kurdish Hunspell. Choose the spelling that fits your meaning.
                    </p>
                    <div className="suggestions">
                      {wordInfo.suggestions
                        .filter((s) => s !== selectedWord)
                        .map((s) => (
                          <div key={s}>
                            <button className="suggestion" onClick={() => replaceWord(s)}>
                              <bdi>{s}</bdi>
                            </button>
                            {issue.occurrences.length > 1 && (
                              <button className="text-button" onClick={() => replaceWord(s, true)}>
                                Replace all
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                    {!wordInfo.suggestions.length && (
                      <p>No suggestions found. You can edit the text directly.</p>
                    )}
                    <div className="panel-actions">
                      <button
                        className="button"
                        onClick={() => {
                          setIgnored((p) => [...p, selectedWord]);
                          setWordInfo(null);
                        }}
                      >
                        Ignore all
                      </button>
                      <button className="button" onClick={() => addPersonal(selectedWord)}>
                        Add to my words
                      </button>
                    </div>
                  </div>
                )}
                {!!ignored.length && (
                  <button className="text-button" onClick={() => setIgnored([])}>
                    Check {ignored.length} ignored words again
                  </button>
                )}
              </>
            )}
            {tab === "cleanup" && (
              <>
                <div className="panel-heading">
                  <h2>Review cleanup</h2>
                  <span className="count-badge">{edits.length}</span>
                </div>
                <p className="panel-description">
                  Choose your preferences, then review each change. Links, emails, and backtick code
                  stay intact.
                </p>
                <div className="cleanup-options">
                  {(
                    [
                      ["letters", "Consistent Kurdish letters"],
                      ["spaces", "Remove repeated spaces"],
                      ["punctuation", "Tidy punctuation spacing"],
                      ["standardize", "KLPT writing conventions"],
                    ] as const
                  ).map(([key, label]) => (
                    <label className="check-label" key={key}>
                      <input
                        type="checkbox"
                        checked={cleanup[key]}
                        onChange={(e) => setCleanup((p) => ({ ...p, [key]: e.target.checked }))}
                      />
                      {label}
                    </label>
                  ))}
                  <label className="select-label">
                    Numbers
                    <select
                      aria-label="Numbers"
                      value={cleanup.digits}
                      onChange={(e) =>
                        setCleanup((p) => ({
                          ...p,
                          digits: e.target.value as CleanupOptions["digits"],
                        }))
                      }
                    >
                      <option value="keep">Keep original</option>
                      <option value="Latin">123</option>
                      <option value="Arabic">١٢٣</option>
                      <option value="Farsi">۱۲۳</option>
                    </select>
                  </label>
                </div>
                <p className="fine-print">
                  Kurdish letter rules can change Arabic quotations. Disable them when preserving
                  Arabic spelling. Writing conventions may change valid regional forms.
                </p>
                <button
                  className="button primary full-width"
                  disabled={!edits.length}
                  onClick={() => {
                    updateText(applyEdits(text, edits), "Applied reviewed cleanup");
                    setNotice("Cleanup applied. Undo is available.");
                  }}
                >
                  Apply {edits.length} changes
                </button>
                <div className="cleanup-list">
                  {edits.slice(0, 100).map((edit) => (
                    <div className="cleanup-item" key={`${edit.start}-${edit.end}`}>
                      <small>{edit.reason}</small>
                      <div>
                        <bdi>{edit.before.replaceAll(" ", "·").replaceAll("\n", "↵")}</bdi>
                        <ArrowRight size={13} />
                        <bdi>
                          {edit.after.replaceAll(" ", "·").replaceAll("\n", "↵") || "Remove"}
                        </bdi>
                        <button
                          className="icon-button"
                          aria-label={`Apply ${edit.reason} at ${edit.start}`}
                          onClick={() => updateText(applyEdits(text, [edit]), edit.reason)}
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {edits.length > 100 && (
                  <p className="fine-print">
                    Showing 100 of {edits.length} proposed changes. The report includes all.
                  </p>
                )}
                <button
                  className="text-button"
                  disabled={!edits.length}
                  onClick={() =>
                    download(
                      JSON.stringify({ dialect, options: cleanup, edits }, null, 2),
                      "cleanup-report.json",
                      "application/json",
                    )
                  }
                >
                  Download proposed changes
                </button>
              </>
            )}
            {tab === "explore" && (
              <>
                <div className="panel-heading">
                  <h2>
                    <BookOpen size={20} /> Word explorer
                  </h2>
                </div>
                <p className="panel-description">
                  See possible roots, dictionary forms, and word types. Try{" "}
                  <bdi>{dialect === "sorani" ? "دیتبامن" : "dibêjim"}</bdi>.
                </p>
                <form
                  className="search-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void inspectWord(selectedWord.trim());
                  }}
                >
                  <input
                    aria-label="Word to explore"
                    value={selectedWord}
                    maxLength={80}
                    dir="auto"
                    onChange={(e) => {
                      wordRequest.current++;
                      setWordBusy(false);
                      setSelectedWord(e.target.value);
                      setWordInfo(null);
                    }}
                  />
                  <button
                    className="button primary"
                    disabled={!engineReady || wordBusy || !selectedWord.trim()}
                  >
                    Explore
                  </button>
                </form>
                {wordBusy && <p role="status">Analyzing word…</p>}
                {wordInfo && (
                  <div className="word-detail">
                    <h3>
                      <bdi>{wordInfo.word}</bdi>
                    </h3>
                    <p className="fine-print">
                      {wordInfo.recognized
                        ? "Recognized by the dictionary."
                        : "Not recognized by this dictionary."}
                    </p>
                    {!wordInfo.readings.length && (
                      <p className="panel-description">
                        No word analysis is available. This can happen with valid names and regional
                        forms.
                      </p>
                    )}
                    {wordInfo.readings.map((reading, i) => (
                      <div className="reading" key={i}>
                        <small>Possible reading {i + 1}</small>
                        <dl>
                          {reading.lemma.length > 0 && (
                            <>
                              <dt>Dictionary form</dt>
                              <dd>
                                <bdi>{reading.lemma.join(" / ")}</bdi>
                              </dd>
                            </>
                          )}
                          {reading.stem.length > 0 && (
                            <>
                              <dt>Root</dt>
                              <dd>
                                <bdi>{reading.stem.join(" / ")}</bdi>
                              </dd>
                            </>
                          )}
                          {reading.kind.length > 0 && (
                            <>
                              <dt>Word type</dt>
                              <dd>{reading.kind.map((k) => kindNames[k] ?? k).join(" · ")}</dd>
                            </>
                          )}
                          {reading.details.length > 0 && (
                            <>
                              <dt>Details</dt>
                              <dd>{reading.details.join(" ")}</dd>
                            </>
                          )}
                        </dl>
                        <details>
                          <summary>Dictionary analysis</summary>
                          <code dir="auto">{reading.raw}</code>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
                <p className="fine-print">
                  Possible word analyses are shown without choosing the meaning of the sentence.
                  This is not a translation dictionary.
                </p>
              </>
            )}
            {tab === "analyze" && (
              <>
                <div className="panel-heading">
                  <h2>Text insights</h2>
                </div>
                <div className="insight-stats">
                  <div>
                    <strong>{stats.words}</strong>
                    <span>Words</span>
                  </div>
                  <div>
                    <strong>{new Set(textTokens.map((t) => wordKey(t.word, dialect))).size}</strong>
                    <span>Unique words</span>
                  </div>
                  <div>
                    <strong>{sentences(text).length}</strong>
                    <span>Sentences*</span>
                  </div>
                </div>
                <div className="cleanup-options">
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={hideCommon}
                      onChange={(e) => {
                        setHideCommon(e.target.checked);
                        setAnalysisText(null);
                      }}
                    />
                    Hide common words (KLPT)
                  </label>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={groupForms}
                      onChange={(e) => {
                        setGroupForms(e.target.checked);
                        setAnalysisText(null);
                      }}
                    />
                    Group unambiguous dictionary forms
                  </label>
                </div>
                <button
                  className="button primary full-width"
                  disabled={!text || !engineReady || analysisBusy}
                  onClick={() => void analyze()}
                >
                  {analysisBusy ? "Analyzing…" : "Analyze vocabulary"}
                </button>
                {analysisText !== null && analysisText !== text && (
                  <p className="fine-print">Text changed. Analyze again to refresh the results.</p>
                )}
                {analysisText === text && (
                  <>
                    <label className="search-field">
                      <Search size={15} />
                      <input
                        aria-label="Search vocabulary"
                        placeholder="Find a word or form"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <p className="fine-print">{filteredVocabulary.length} vocabulary entries</p>
                    <div className="vocabulary-list">
                      {filteredVocabulary.slice(0, 100).map((v) => (
                        <button
                          key={v.word}
                          onClick={() => {
                            setTab("explore");
                            void inspectWord(v.forms[0]);
                          }}
                        >
                          <span>
                            <bdi>{v.word}</bdi>
                            {v.forms.length > 1 && (
                              <small>
                                <bdi>{v.forms.join(" · ")}</bdi>
                              </small>
                            )}
                          </span>
                          <strong>{v.count}</strong>
                        </button>
                      ))}
                    </div>
                    <button
                      className="text-button"
                      onClick={() =>
                        download(
                          csv([
                            ["Word", "Occurrences", "Forms"],
                            ...vocabulary.map((v) => [v.word, v.count, v.forms.join(" | ")]),
                          ]),
                          "vocabulary.csv",
                          "text/csv;charset=utf-8",
                        )
                      }
                    >
                      Export full vocabulary CSV
                    </button>
                  </>
                )}
                <button
                  className="text-button"
                  disabled={!text}
                  onClick={() => download(sentences(text).join("\n"), "sentences.txt")}
                >
                  Export sentences
                </button>
                <p className="fine-print">
                  *Sentence boundaries are approximate. Vocabulary includes words in the selected
                  script; foreign passages may be included.
                </p>
              </>
            )}
            {tab === "convert" && (
              <>
                <div className="panel-heading">
                  <h2>Change alphabet</h2>
                </div>
                <p className="panel-description">
                  Create an editable draft in another alphabet. The Kurdish variety stays the same.
                </p>
                <label className="select-label">
                  Direction
                  <select
                    aria-label="Direction"
                    value={direction}
                    onChange={(e) => {
                      setDirection(e.target.value as typeof direction);
                      setConversionSource(null);
                    }}
                  >
                    <option value="arabic-to-latin">Arabic-based → Latin</option>
                    <option value="latin-to-arabic">Latin → Arabic-based</option>
                  </select>
                </label>
                <p className="fine-print">
                  Experimental. Arabic → Latin marks ambiguous letters as {"{w/u}"} and {"{y/î}"}.
                  Missing short i is not recovered. Latin → Arabic uses Sorani-style spelling and
                  loses some distinctions.
                </p>
                <button className="button primary full-width" disabled={!text} onClick={convert}>
                  Create draft
                </button>
                {conversionSource !== null && (
                  <>
                    <label className="field-label" htmlFor="converted-text">
                      Edit converted draft
                    </label>
                    <textarea
                      id="converted-text"
                      value={conversion}
                      dir="auto"
                      onChange={(e) => setConversion(e.target.value)}
                      maxLength={DOCUMENT_LIMIT * 6}
                    />
                    <div className="panel-actions">
                      <button
                        className="button"
                        onClick={() =>
                          download(conversion, safeName(current.title) + "-converted.txt")
                        }
                      >
                        Download draft
                      </button>
                      <button
                        className="button"
                        onClick={() => {
                          openDraft({
                            ...newDraft(dialect),
                            title: current.title + " — converted",
                            text: conversion,
                          });
                        }}
                      >
                        Open as document
                      </button>
                    </div>
                    {conversionSource !== text && (
                      <p className="fine-print">
                        The source text changed after this draft was created.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
            {tab === "files" && (
              <>
                <div className="panel-heading">
                  <h2>Documents & files</h2>
                </div>
                <p className="panel-description">
                  Import TXT, Markdown, or Word files. Word import keeps text and paragraphs; export
                  creates a new document.
                </p>
                <div className="panel-actions">
                  <button
                    className="button"
                    disabled={busy || !text}
                    onClick={() => {
                      setBusy(true);
                      void exportDocx(text, current.title, dialect)
                        .catch((e) => setError(message(e)))
                        .finally(() => setBusy(false));
                    }}
                  >
                    Export Word
                  </button>
                  <button
                    className="button"
                    disabled={!text}
                    onClick={() =>
                      download(
                        JSON.stringify(
                          {
                            title: current.title,
                            dialect,
                            text,
                            statistics: stats,
                            spelling: checkedText === text ? issues : null,
                            sessionChanges: sessionEdits,
                          },
                          null,
                          2,
                        ),
                        "document-report.json",
                        "application/json",
                      )
                    }
                  >
                    Export report
                  </button>
                </div>
                <div className="section-divider" />
                <h3>Batch cleanup</h3>
                <p className="panel-description">
                  Use your Cleanup preferences on up to 20 files. Review the result before
                  downloading. Originals are kept intact.
                </p>
                <button
                  className="button full-width"
                  disabled={busy}
                  onClick={() => batchInput.current?.click()}
                >
                  <Upload size={15} />
                  {busy ? "Processing files…" : "Choose multiple files"}
                </button>
                <input
                  className="sr-only"
                  ref={batchInput}
                  type="file"
                  multiple
                  accept=".txt,.md,.docx"
                  onChange={(e) => void loadBatch(e.target.files)}
                />
                {batch.length > 0 && (
                  <>
                    <label className="field-label" htmlFor="batch-preview">
                      Preview file
                    </label>
                    <select
                      id="batch-preview"
                      value={batchPreview}
                      onChange={(e) => setBatchPreview(Number(e.target.value))}
                    >
                      {batch.map((f, i) => (
                        <option key={i} value={i}>
                          {f.name} · {f.edits.length} changes
                        </option>
                      ))}
                    </select>
                    <textarea
                      aria-label="Batch cleaned preview"
                      readOnly
                      dir="auto"
                      value={batch[batchPreview]?.cleaned ?? ""}
                    />
                    <p className="fine-print">
                      Snapshot of preferences at import time. Reimport files after changing cleanup
                      settings.
                    </p>
                    <button
                      className="button primary full-width"
                      onClick={() =>
                        void exportZip(
                          batch.flatMap((f, i) => [
                            { name: `${i + 1}-${safeName(f.name)}.txt`, text: f.cleaned },
                            {
                              name: `${i + 1}-${safeName(f.name)}-report.json`,
                              text: JSON.stringify({ file: f.name, edits: f.edits }, null, 2),
                            },
                          ]),
                        ).catch((e) => setError(message(e)))
                      }
                    >
                      Download cleaned files & reports
                    </button>
                  </>
                )}
                <div className="section-divider" />
                <h3>Local documents</h3>
                <p className="fine-print">
                  Stored in this browser, without account sync. Download backups before clearing
                  browser data.
                </p>
                <div className="local-documents">
                  {drafts.map((d) => (
                    <div key={d.id}>
                      <button
                        className="text-button"
                        onClick={() => {
                          setActive(d.id);
                          resetReview();
                        }}
                      >
                        {d.title || "Untitled"}
                      </button>
                      <button
                        className="icon-button"
                        disabled={drafts.length <= 1}
                        aria-label={`Remove ${d.title}`}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Remove “${d.title}” from this browser? Download a copy first if you need it.`,
                            )
                          )
                            return;
                          setDrafts((p) => p.filter((item) => item.id !== d.id));
                          if (active === d.id)
                            setActive(drafts.find((item) => item.id !== d.id)!.id);
                          resetReview();
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {tab === "dictionary" && (
              <>
                <div className="panel-heading">
                  <h2>My {dialect === "sorani" ? "Sorani" : "Kurmanji"} words</h2>
                  <span className="count-badge">{personal[dialect].length}</span>
                </div>
                <p className="panel-description">
                  Save names, regional words, and specialist terms. Your words stay in this browser.
                </p>
                <form
                  className="search-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addPersonal(dictionaryInput);
                  }}
                >
                  <input
                    aria-label="Personal dictionary word"
                    dir="auto"
                    value={dictionaryInput}
                    onChange={(e) => setDictionaryInput(e.target.value)}
                    maxLength={80}
                  />
                  <button className="button primary" disabled={!dictionaryInput.trim()}>
                    Add
                  </button>
                </form>
                <div className="personal-words">
                  {personal[dialect].map((word) => (
                    <div key={word}>
                      <bdi>{word}</bdi>
                      <button
                        className="icon-button"
                        aria-label={`Remove word ${word}`}
                        onClick={() =>
                          setPersonal((p) => ({
                            ...p,
                            [dialect]: p[dialect].filter((w) => w !== word),
                          }))
                        }
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="text-button"
                  disabled={!personal[dialect].length}
                  onClick={() => download(personal[dialect].join("\n"), `my-${dialect}-words.txt`)}
                >
                  Export my words
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
      {error && (
        <div className="workspace-message error" role="alert">
          {error}
          <button className="icon-button" aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {notice && (
        <div className="workspace-message" role="status">
          {notice}
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setNotice("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="workspace-credits">
        <span>
          Kurdish language resources by{" "}
          <a href="https://github.com/sinaahmadi/KurdishHunspell">Sina Ahmadi · Kurdish Hunspell</a>{" "}
          & <a href="https://github.com/sinaahmadi/klpt">KLPT</a>
        </span>
        <a href="/credits/">Sources & licenses</a>
      </div>
    </section>
  );
}
