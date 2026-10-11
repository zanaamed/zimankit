"use client";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Copy, Download, FileText, RotateCcw, Upload, X } from "lucide-react";
import {
  processText,
  type Direction,
  type Language,
  type Operation,
  type Options,
} from "zimankit";
import { exampleFor } from "@/lib/examples";
import { ResultDetails } from "./result-details";

const cleanSettings: { key: keyof Options; label: string; description: string }[] = [
  {
    key: "collapseSpaces",
    label: "Repeated spaces",
    description: "Collapse ordinary spaces and tabs; preserve paragraphs.",
  },
  { key: "normalizeLineEndings", label: "Line endings", description: "Convert CRLF and CR to LF." },
  {
    key: "trimLines",
    label: "Trim line edges",
    description: "Remove ordinary spaces and tabs at each line edge.",
  },
  {
    key: "punctuationSpacing",
    label: "Punctuation spacing",
    description: "Remove ordinary spaces before commas, semicolons and question/exclamation marks.",
  },
  {
    key: "removeTatweel",
    label: "Elongation marks",
    description: "Remove decorative Arabic tatweel (ـ).",
  },
  {
    key: "removeControls",
    label: "Formatting controls",
    description:
      "Remove selected invisible controls. Preserve joiners and non-breaking spaces. Review direction afterwards.",
  },
];
function saveFile(contents: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Playground() {
  const [language, setLanguage] = useState<Language>("sorani");
  const [operation, setOperation] = useState<Operation>("normalize");
  const [direction, setDirection] = useState<Direction>("arabic-to-latin");
  const [text, setText] = useState(() => exampleFor("sorani", "normalize"));
  const [settings, setSettings] = useState<Options>({
    kurdishVariants: true,
    collapseSpaces: true,
    normalizeLineEndings: true,
  });
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Partial<Record<Operation, HTMLButtonElement | null>>>({});
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const output = useMemo(() => {
    try {
      return {
        result: processText(text, { ...settings, language, operation, direction }),
        error: "",
      };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : "Unable to process this text.",
      };
    }
  }, [text, settings, language, operation, direction]);
  const { result, error } = output;
  function resetCopy() {
    setCopied(false);
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }
  function updateText(next: string) {
    setText(next);
    setNotice("");
    resetCopy();
  }
  async function copyResult() {
    if (!result?.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setNotice("Result copied.");
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice("Clipboard is unavailable. Select the result text and copy it manually.");
    }
  }
  async function importText(file?: File) {
    if (!file) return;
    if (file.size > 100_000) {
      setNotice("This file exceeds 100 KB. Choose a smaller UTF-8 text file.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    try {
      const value = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      updateText(value);
      setNotice(`Loaded ${file.name}.`);
    } catch {
      setNotice("Could not read the file as UTF-8 text. Save it as UTF-8 and try again.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  function chooseLanguage(next: Language) {
    setLanguage(next);
    resetCopy();
    setNotice("");
    if (next === "unicode" && operation === "transliterate") setOperation("normalize");
  }
  const scriptLabel = result
    ? {
        arabic: "Arabic script",
        latin: "Latin script",
        mixed: "Mixed scripts",
        unknown: "No Arabic or Latin letters",
      }[result.script.kind]
    : "Waiting for valid text";
  return (
    <section className="workspace" aria-label="Kurdish text playground">
      <div className="operation-tabs" role="tablist" aria-label="Text operation">
        {(["normalize", "clean", "transliterate"] as const).map((tab) => (
          <button
            ref={(element) => {
              tabRefs.current[tab] = element;
            }}
            type="button"
            key={tab}
            id={`tab-${tab}`}
            role="tab"
            tabIndex={operation === tab ? 0 : -1}
            aria-selected={operation === tab}
            aria-controls="processing-panel"
            disabled={tab === "transliterate" && language === "unicode"}
            onKeyDown={(event) => {
              const available: Operation[] =
                language === "unicode"
                  ? ["normalize", "clean"]
                  : ["normalize", "clean", "transliterate"];
              const index = available.indexOf(tab);
              const next =
                event.key === "ArrowRight"
                  ? available[(index + 1) % available.length]
                  : event.key === "ArrowLeft"
                    ? available[(index + available.length - 1) % available.length]
                    : event.key === "Home"
                      ? available[0]
                      : event.key === "End"
                        ? available[available.length - 1]
                        : undefined;
              if (next) {
                event.preventDefault();
                setOperation(next);
                resetCopy();
                setNotice("");
                tabRefs.current[next]?.focus();
              }
            }}
            onClick={() => {
              setOperation(tab);
              resetCopy();
              setNotice("");
            }}
          >
            {tab === "normalize" ? "Normalize" : tab === "clean" ? "Clean" : "Transliterate"}
            {tab === "transliterate" && <span className="experimental-label">Experimental</span>}
          </button>
        ))}
      </div>
      <div id="processing-panel" role="tabpanel" aria-labelledby={`tab-${operation}`}>
        <div className="toolbar">
          <div className="language-control">
            <label htmlFor="language">Language</label>
            <select
              id="language"
              value={language}
              onChange={(e) => chooseLanguage(e.target.value as Language)}
            >
              <option value="sorani">Sorani (سۆرانی)</option>
              <option value="kurmanji">Kurmanji (Kurmancî)</option>
              <option value="unicode">Unicode only · any language</option>
            </select>
          </div>
          <div className="toolbar-actions">
            <input
              ref={fileInput}
              type="file"
              accept=".txt,text/plain"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => void importText(e.target.files?.[0])}
            />
            <button
              type="button"
              className="text-button"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={15} aria-hidden="true" />
              <span>Import .txt</span>
            </button>
            <button
              type="button"
              className="button"
              onClick={() =>
                updateText(
                  operation === "transliterate" && direction === "latin-to-arabic"
                    ? "Silav! Ev amûreke ji bo nivîsa Kurdî ye."
                    : exampleFor(language, operation),
                )
              }
            >
              <FileText size={16} aria-hidden="true" />
              Load example
            </button>
          </div>
        </div>
        <div className="settings-row">
          {operation === "normalize" && (
            <>
              {language === "sorani" ? (
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={settings.kurdishVariants !== false}
                    onChange={(e) => {
                      setSettings((s) => ({ ...s, kurdishVariants: e.target.checked }));
                      resetCopy();
                    }}
                  />
                  <span>Standardize Kurdish kaf and yeh</span>
                </label>
              ) : (
                <span>Compose Unicode characters (NFC). Preserve case and diacritics.</span>
              )}
              <span className="profile-note">
                {language === "sorani"
                  ? "For Arabic quotations, choose Unicode only."
                  : "No spelling or language conversion."}
              </span>
            </>
          )}
          {operation === "clean" &&
            cleanSettings.map((setting) => (
              <label key={setting.key} className="check-label" title={setting.description}>
                <input
                  type="checkbox"
                  checked={settings[setting.key] === true}
                  onChange={(e) => {
                    setSettings((s) => ({ ...s, [setting.key]: e.target.checked }));
                    resetCopy();
                  }}
                />
                <span>{setting.label}</span>
              </label>
            ))}
          {operation === "transliterate" && (
            <>
              <label className="direction-label">
                Direction
                <select
                  aria-label="Transliteration direction"
                  value={direction}
                  onChange={(e) => {
                    setDirection(e.target.value as Direction);
                    resetCopy();
                  }}
                >
                  <option value="arabic-to-latin">Arabic → Latin annotated draft</option>
                  <option value="latin-to-arabic">Latin → Arabic draft</option>
                </select>
              </label>
              <span className="profile-note">Changes the script, not the language.</span>
            </>
          )}
        </div>
        {operation === "transliterate" && (
          <div className="experimental-note">
            <strong>Review this draft.</strong>{" "}
            {direction === "arabic-to-latin"
              ? "{w/u} and {y/î} show unresolved letters. Unwritten short i is not recovered."
              : "Capitalization and short i are lost. This conversion is not reversible."}{" "}
            <a href="/docs/#transliteration">
              Read limitations <ArrowRight size={13} aria-hidden="true" />
            </a>
          </div>
        )}
        <div className="editors">
          <div className="editor">
            <div className="editor-heading">
              <label htmlFor="original">Original</label>
              <button
                type="button"
                className="icon-button"
                aria-label="Clear original text"
                disabled={!text}
                onClick={() => updateText("")}
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            <textarea
              id="original"
              aria-describedby="input-status input-error"
              placeholder="Paste Kurdish text here…"
              value={text}
              onChange={(e) => updateText(e.target.value)}
              dir="auto"
              lang={language === "sorani" ? "ckb" : language === "kurmanji" ? "ku" : undefined}
              spellCheck={false}
            />
            <div className="editor-footer" id="input-status">
              <span className="script-status">
                <span
                  className={`status-dot ${result?.script.kind === "mixed" ? "mixed" : ""}`}
                  aria-hidden="true"
                />
                {scriptLabel}
                {text && result?.script.kind !== "unknown" ? " detected" : ""}
              </span>
              <span>{text.length.toLocaleString("en")} / 20,000</span>
            </div>
          </div>
          <div className="editor">
            <div className="editor-heading">
              <label htmlFor="result">
                {operation === "transliterate" ? "Draft result" : "Result"}
              </label>
              <span className="live-label">
                {error ? "Input needs attention" : "Updates instantly"}
              </span>
            </div>
            <textarea
              id="result"
              value={result?.text ?? ""}
              readOnly
              dir={result?.outputScript.direction ?? "auto"}
              lang={
                operation === "transliterate"
                  ? undefined
                  : language === "sorani"
                    ? "ckb"
                    : language === "kurmanji"
                      ? "ku"
                      : undefined
              }
              placeholder="Your processed text appears here…"
              spellCheck={false}
            />
            <div className="editor-footer result-actions">
              <button
                type="button"
                className="text-button report-download"
                disabled={!result || !text}
                onClick={() =>
                  result &&
                  saveFile(
                    JSON.stringify(result, null, 2),
                    "zimankit-report.json",
                    "application/json;charset=utf-8",
                  )
                }
              >
                <FileText size={15} aria-hidden="true" />
                JSON report
              </button>
              <div>
                <button
                  type="button"
                  className="button primary"
                  disabled={!result?.text}
                  onClick={() => void copyResult()}
                >
                  {copied ? (
                    <Check size={16} aria-hidden="true" />
                  ) : (
                    <Copy size={16} aria-hidden="true" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  className="button"
                  disabled={!result?.text}
                  onClick={() =>
                    result &&
                    saveFile(result.text, "zimankit-result.txt", "text/plain;charset=utf-8")
                  }
                >
                  <Download size={16} aria-hidden="true" />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
        <div id="input-error">
          {error && (
            <p className="input-error" role="alert">
              {error} Your original has been preserved.
            </p>
          )}
        </div>
        <div className="notification" role="status" aria-live="polite">
          {notice}
        </div>
        <ResultDetails result={result} />
        <div className="workspace-bottom">
          <span>No accounts. Text processing happens on your device.</span>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setLanguage("sorani");
              setOperation("normalize");
              setDirection("arabic-to-latin");
              setSettings({
                kurdishVariants: true,
                collapseSpaces: true,
                normalizeLineEndings: true,
              });
              updateText(exampleFor("sorani", "normalize"));
            }}
          >
            <RotateCcw size={13} aria-hidden="true" />
            Reset workspace
          </button>
        </div>
      </div>
    </section>
  );
}
