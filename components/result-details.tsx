import { ArrowRight, Info } from "lucide-react";
import type { Result } from "zimankit";
function visible(text: string) {
  if (!text) return "∅";
  return text
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(
      /[\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/gu,
      (c) => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`,
    )
    .replace(/ /g, "␣");
}
export function ResultDetails({ result }: { result: Result | null }) {
  const stats = result?.statistics;
  const changeCount = result?.changes.reduce((n, change) => n + change.count, 0) ?? 0;
  return (
    <>
      <dl className="stats" aria-label="Result statistics">
        {[
          ["Words", stats?.words],
          ["Characters", stats?.characters],
          ["Sentences", stats?.sentences],
          ["Changes", result ? changeCount : undefined],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <dt>
              {label}
              {label === "Sentences" && <span className="sr-only"> (approximate)</span>}
            </dt>
            <dd>{value === undefined ? "—" : value.toLocaleString("en")}</dd>
          </div>
        ))}
      </dl>
      <div className="changes-area">
        <div className="section-label">
          <span>Change report</span>
          <span>
            {result?.original
              ? `${stats?.codePoints.toLocaleString("en")} code points · ${stats?.lines} ${stats?.lines === 1 ? "line" : "lines"}`
              : "Nothing is changed silently"}
          </span>
        </div>
        {result?.changes.length ? (
          <ul className="change-list">
            {result.changes.map((change) => (
              <li key={change.rule}>
                <div className="change-examples">
                  {change.examples.slice(0, 2).map((example, i) => (
                    <span className="change-pair" key={i}>
                      <bdi>{visible(example.before)}</bdi>
                      <ArrowRight size={14} aria-hidden="true" />
                      <bdi>{visible(example.after)}</bdi>
                    </span>
                  ))}
                </div>
                <span>{change.label}</span>
                <span className="change-count">×{change.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-changes">
            {result?.original
              ? "No changes needed with these settings."
              : "Paste your text or load an example to see the changes here."}
          </p>
        )}
        {!!result?.warnings.length && (
          <details className="notes">
            <summary>
              <Info size={15} aria-hidden="true" /> Processing notes ({result.warnings.length})
            </summary>
            <ul>
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </details>
        )}
        <p className="stats-note">
          Characters count visible grapheme clusters, including spaces and line breaks. Sentence
          counts are approximate.
        </p>
      </div>
    </>
  );
}
