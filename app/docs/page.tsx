import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Header, Footer, REPO_URL } from "@/components/chrome";
export const metadata: Metadata = {
  title: "Documentation",
  alternates: { canonical: "/docs/" },
  openGraph: {
    title: "Documentation — ZimanKit",
    description: "Usage, linguistic limitations, library, and API documentation for ZimanKit.",
    type: "website",
    url: "/docs/",
  },
};
const sections = [
  ["workspace", "Writing workspace"],
  ["start", "Get started"],
  ["profiles", "Language profiles"],
  ["cleaning", "Cleaning"],
  ["transliteration", "Transliteration"],
  ["statistics", "Statistics"],
  ["library", "Developer library"],
  ["api", "REST API"],
  ["self-host", "Run it yourself"],
  ["sources", "Sources & contributions"],
];
export default function Docs() {
  return (
    <div className="site-frame">
      <Header active="docs" />
      <main id="main">
        <section className="hero docs-hero">
          <h1>
            Using ZimanKit.
            <br />
            <span>Tools, library, and API.</span>
          </h1>
          <p>
            How the workspace works, what the text rules change, and how to use the library in your
            own project.
          </p>
        </section>
        <div className="docs-layout">
          <nav className="docs-nav" aria-label="Documentation sections">
            {sections.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
          <article className="docs-content">
            <section id="workspace" className="docs-section">
              <h2>Writing workspace</h2>
              <p>
                The <a href="/">workspace</a> supports Sorani in Arabic-based writing and Kurmanji
                in Latin writing. Type or import a TXT, Markdown, or Word document. Spelling checks,
                word analysis, and file processing run on your device.
              </p>
              <ul>
                <li>
                  <strong>Spelling:</strong> review unrecognized words, choose a suggestion, replace
                  one or all occurrences, ignore words for this document session, or save them in a
                  personal dictionary. Use Review words to see underlines in context. An
                  unrecognized word is not necessarily incorrect.
                </li>
                <li>
                  <strong>Cleanup:</strong> review selected KLPT letter rules, optional writing
                  conventions, number conversion, and spacing changes. Apply one or all changes.
                  Undo and redo cover the last 40 text states.
                </li>
                <li>
                  <strong>Word explorer:</strong> inspect possible dictionary forms, roots, and word
                  types from Kurdish Hunspell. Readings are alternatives, not a sentence-level
                  meaning prediction.
                </li>
                <li>
                  <strong>Text insights:</strong> export vocabulary counts and approximate
                  sentences. KLPT common-word lists can filter frequent words. Grouping uses
                  dictionary forms only when analysis gives one distinct form.
                </li>
                <li>
                  <strong>Files:</strong> import up to 100,000 characters per document, export text
                  or a new Word document, or clean up to 20 files and download a ZIP with reports.
                  Word import retains text and paragraphs, not original layout, images, or tables.
                </li>
                <li>
                  <strong>Local storage:</strong> up to 20 drafts and 5,000 personal words per
                  variety are saved in this browser. There is no account sync. Export backups before
                  clearing browser data.
                </li>
              </ul>
              <p>
                Dictionary files load from this site. Your document is not uploaded. Spelling checks
                cover the selected script, so Arabic quotations in Sorani and English passages in
                Kurmanji may be flagged. Links, email addresses, and backtick code are skipped. No
                grammar correction, translation, or independently measured accuracy claim is
                provided.
              </p>
              <p>
                <a href="/credits/">Sources, licenses, and limitations</a>. The separate text tools
                and existing API below retain their original limits and behavior; the API does not
                expose the new browser spelling engine.
              </p>
            </section>
            <section id="start" className="docs-section">
              <h2>Standalone text tools</h2>
              <ol>
                <li>
                  Choose Sorani, Kurmanji, or Unicode only. The script detector does not choose a
                  language for you.
                </li>
                <li>
                  Paste text or import a UTF-8 <code>.txt</code> file. Choose Normalize, Clean, or
                  experimental Transliterate.
                </li>
                <li>
                  Review the result, change report, and processing notes. Copy the result, download
                  text, or export the full JSON report.
                </li>
              </ol>
              <p>
                The playground runs entirely in your browser. Text is not submitted to the API,
                stored in cookies, or sent to analytics. The optional public API is a separate way
                to use the same engine.
              </p>
              <a href="/tools/" className="text-link">
                Open the playground{" "}
                <ArrowRight size={14} style={{ display: "inline" }} aria-hidden="true" />
              </a>
            </section>
            <section id="profiles" className="docs-section">
              <h2>Language profiles for the text tools</h2>
              <p>
                The library and text tools first apply Unicode NFC. It composes equivalent
                sequences, such as a letter plus a combining accent. These tools preserve case and
                diacritics and do not correct spelling. Use the workspace for spelling suggestions.
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Profile</th>
                      <th>Normalization</th>
                      <th>Preserved</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Sorani</td>
                      <td>
                        <bdi>ك → ک</bdi> and <bdi>ي → ی</bdi>, when the variant option is enabled.
                      </td>
                      <td>
                        Distinct Kurdish letters, vowels, diacritics, digits, and original spelling.
                      </td>
                    </tr>
                    <tr>
                      <td>Kurmanji</td>
                      <td>NFC, including decomposed ç, ê, î, ş, and û.</td>
                      <td>
                        Capitalization and diacritics. Turkish ı is not silently changed to i.
                      </td>
                    </tr>
                    <tr>
                      <td>Unicode only</td>
                      <td>NFC only; no Kurdish character replacement.</td>
                      <td>Arabic quotations and mixed-language spellings.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="docs-callout">
                <p>
                  Sorani replacements apply to every matching character in the selected passage,
                  including Arabic quotations. Use Unicode only for those passages. Similar-looking
                  characters such as <bdi>ه / ە</bdi>, <bdi>ر / ڕ</bdi>, and <bdi>ل / ڵ</bdi> remain
                  distinct.
                </p>
              </div>
              <p>
                Legacy font encodings and Arabic presentation forms are not converted by the
                library. Presentation forms are flagged. Script detection reports Arabic, Latin,
                mixed, or unknown based on letters; it does not establish whether text is Kurdish.
              </p>
            </section>
            <section id="cleaning" className="docs-section">
              <h2>Cleaning options</h2>
              <p>
                Clean applies NFC and the selected formatting options. It does not also apply Sorani
                variant replacements; use Normalize first if you want both.
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Option</th>
                      <th>Default</th>
                      <th>Behavior</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Repeated spaces</td>
                      <td>On</td>
                      <td>
                        Collapse ordinary spaces and tabs. Preserve newlines and non-breaking
                        spaces.
                      </td>
                    </tr>
                    <tr>
                      <td>Line endings</td>
                      <td>On</td>
                      <td>Convert CRLF and CR to LF. Keep paragraphs and blank lines.</td>
                    </tr>
                    <tr>
                      <td>Trim line edges</td>
                      <td>Off</td>
                      <td>
                        Remove ordinary spaces and tabs at the beginning and end of each line.
                      </td>
                    </tr>
                    <tr>
                      <td>Punctuation spacing</td>
                      <td>Off</td>
                      <td>
                        Remove ordinary spaces before , ، ; ؛ ! ? ؟. Does not infer missing spaces
                        or rewrite punctuation.
                      </td>
                    </tr>
                    <tr>
                      <td>Elongation marks</td>
                      <td>Off</td>
                      <td>
                        Remove tatweel (<bdi>ـ</bdi>).
                      </td>
                    </tr>
                    <tr>
                      <td>Formatting controls</td>
                      <td>Off</td>
                      <td>
                        Remove U+200B, U+200E–200F, U+202A–202E, U+2060, U+2066–2069, and U+FEFF.
                        Review direction and word boundaries afterwards.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Joiners (ZWJ), non-joiners (ZWNJ), combining marks, emoji sequences, and
                non-breaking spaces are preserved. Cleaning code or formatted documents may alter
                indentation; disable repeated spaces and trim options for those inputs.
              </p>
            </section>
            <section id="transliteration" className="docs-section">
              <h2>Experimental transliteration</h2>
              <div className="docs-callout">
                <p>
                  <strong>Transliteration changes the script, not the language.</strong> Sorani does
                  not become Kurmanji. This feature produces a draft for review, not guaranteed
                  pronunciation or translation.
                </p>
              </div>
              <p>
                ZimanKit uses a documented extended Hawar-style Latin mapping: ç, ş, j, x, ê, î, û,
                plus ł for <bdi>ڵ</bdi>, ř for <bdi>ڕ</bdi>, ḥ for <bdi>ح</bdi>, ẍ for <bdi>غ</bdi>,
                and ʿ for <bdi>ع</bdi>. This is an explicit project convention, not a claim of a
                universal Kurdish romanization standard.
              </p>
              <h3>Arabic → Latin: an annotated draft</h3>
              <p>
                The letters <bdi>و</bdi> and <bdi>ی</bdi> may represent multiple sounds. Single
                occurrences become <code>{"{w/u}"}</code> and <code>{"{y/î}"}</code>, rather than a
                guessed reading. Double <bdi>وو</bdi> becomes û. Initial <bdi>ئ</bdi> is removed
                only before a recognized written vowel. Unwritten short i (bizroke) is not
                reconstructed.
              </p>
              <pre>
                <code>{"کوردی → k{w/u}rd{y/î}\nئاسۆ → aso\nڕێگا → řêga"}</code>
              </pre>
              <h3>Latin → Arabic: a lossy draft</h3>
              <p>
                Uses Sorani-style Arabic spelling for either selected variety. Initial written
                vowels receive a carrier; capitalization is lost, short i is omitted, w/u merge as{" "}
                <bdi>و</bdi>, and y/î merge as <bdi>ی</bdi>. Round trips are not guaranteed. Names,
                foreign words, URLs, and dialect-specific conventions need manual review. Unknown
                characters are retained and flagged.
              </p>
              <p>
                No dictionary, AI model, or paid service is used. There is no independently measured
                linguistic accuracy score for this release.
              </p>
            </section>
            <section id="statistics" className="docs-section">
              <h2>Counts with defined meanings</h2>
              <ul>
                <li>
                  <strong>Words:</strong> runs of Unicode letters or numbers, including combining
                  marks. Internal apostrophes and joining controls remain part of a word. Hyphens
                  and punctuation split words; decimals contribute two numeric runs.
                </li>
                <li>
                  <strong>Characters:</strong> grapheme clusters via <code>Intl.Segmenter</code>,
                  including whitespace. A joined emoji can be one character but several code points.
                  Unicode segmentation depends on the runtime’s Unicode version.
                </li>
                <li>
                  <strong>Sentences:</strong> approximate segments containing letters/numbers
                  separated by . ! ? ؟ ۔ or …. Decimal points are excluded. Abbreviations, URLs, and
                  unusual punctuation may inflate counts.
                </li>
                <li>
                  <strong>Changes:</strong> the sum of changed spans across pipeline rules. This is
                  not an edit distance. The JSON report includes up to four before/after examples
                  per rule.
                </li>
              </ul>
              <p>
                Counts describe the result. Empty input has zero words, characters, sentences, and
                lines. Source and output remain available in the JSON report.
              </p>
            </section>
            <section id="library" className="docs-section">
              <h2>One engine. Your project.</h2>
              <p>
                The TypeScript library has no framework or service dependency. Build it from the
                repository, pack it, and install the local archive in your own app. v0.1 is
                available from GitHub; it has not been published to npm.
              </p>
              <pre>
                <code>
                  {
                    "git clone https://github.com/zanaamed/zimankit.git\ncd zimankit\nnpm ci\nnpm run build:core\nnpm pack --workspace zimankit\n# In your other project:\nnpm install /path/to/zimankit/zimankit-0.1.0.tgz"
                  }
                </code>
              </pre>
              <pre>
                <code>
                  {
                    "import { processText, detectScript, getStatistics } from 'zimankit';\n\nconst result = processText('كوردی', {\n  language: 'sorani',\n  operation: 'normalize',\n});\nconsole.log(result.text); // کوردی\nconsole.log(result.changes);\nconsole.log(detectScript('Silav!').kind); // latin"
                  }
                </code>
              </pre>
              <p>
                <code>processText(text, options)</code> defaults to Unicode-only normalization. It
                returns the original, processed text, profile, script information, statistics,
                changes, warnings, experimental flag, and engine version. Invalid options throw{" "}
                <code>TypeError</code>; oversized text throws <code>RangeError</code>. Input must be
                well-formed Unicode and at most 20,000 UTF-16 code units.
              </p>
            </section>
            <section id="api" className="docs-section">
              <h2>A small REST API</h2>
              <p>
                Same-origin endpoint: <code>POST /api/v1/process</code>. Set{" "}
                <code>Content-Type: application/json</code>. The API defaults to Unicode-only
                normalization, supports CORS, and does not store request text in application code.
                Your text is sent to the server when you call this endpoint; the playground never
                calls it.
              </p>
              <pre>
                <code>
                  {
                    "fetch('/api/v1/process', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    text: 'كوردی',\n    options: { language: 'sorani', operation: 'normalize' },\n  }),\n}).then(response => response.json());"
                  }
                </code>
              </pre>
              <p>
                Supported options: <code>language</code>, <code>operation</code>,{" "}
                <code>direction</code>, <code>kurdishVariants</code>, <code>collapseSpaces</code>,{" "}
                <code>normalizeLineEndings</code>, <code>trimLines</code>,{" "}
                <code>punctuationSpacing</code>, <code>removeTatweel</code>, and{" "}
                <code>removeControls</code>. Flags are booleans. Transliterating requires a language
                and explicit <code>arabic-to-latin</code> or <code>latin-to-arabic</code> direction.
              </p>
              <p>
                API limits: 2,000 UTF-16 code units per text and 100,000 bytes per JSON body. The
                smaller API limit helps bound free-plan CPU use; the playground and local library
                accept 20,000. Responses: 200 success, 400 invalid JSON/options, 405 wrong method,
                413 oversized input, 415 wrong media type. Errors use{" "}
                <code>{'{ "error": "message" }'}</code>. <code>GET /api/v1/health</code> returns
                status, version, and text limit. API availability is subject to the host’s free-plan
                quotas.
              </p>
              <p>
                For local API testing, build the project and run <code>npm run preview</code>. The
                Next.js development server serves the playground; the API runs in the Cloudflare
                Worker preview.
              </p>
            </section>
            <section id="self-host" className="docs-section">
              <h2>Download it. Build it yourself.</h2>
              <p>
                Use Node.js 24 (or a supported Node version ≥22) and npm. No API key, account,
                database, or cloud subscription is needed to run the library and playground locally.
              </p>
              <pre>
                <code>
                  {
                    "git clone https://github.com/zanaamed/zimankit.git\ncd zimankit\nnpm ci\nnpm run dev\n# Playground: http://127.0.0.1:3000\n\nnpm run check\nnpm run preview\n# Playground and API: http://localhost:8787"
                  }
                </code>
              </pre>
              <p>
                Next.js exports static files into <code>out/</code>. These can be hosted on any
                static host; the API requires the included Worker. To deploy both to your own
                Cloudflare Workers Free account, run <code>npx wrangler login</code>, then{" "}
                <code>npm run deploy</code>. No storage or paid bindings are configured.
              </p>
            </section>
            <section id="sources" className="docs-section">
              <h2>Sources and corrections</h2>
              <p>
                If a rule changes text incorrectly, open an issue with a short example, the language
                or tool you used, and the result you expected. A spelling reference or explanation
                helps. Leave out private document content.
              </p>
              <p>
                ZimanKit’s code is MIT licensed. KurdishHunspell and KLPT data keep their CC BY-SA
                4.0 licenses; the engine and fonts have separate licenses. See the{" "}
                <a href="/credits/">credits page</a> for the full list. The references below cover
                Unicode normalization and Kurdish transliteration.
              </p>
              <ul>
                <li>
                  <a href="https://www.unicode.org/reports/tr15/">
                    Unicode normalization specification
                  </a>
                </li>
                <li>
                  <a href="https://aclanthology.org/2016.clib-1.11/">
                    Jaf (2016): ambiguously encoded Kurdish characters
                  </a>
                </li>
                <li>
                  <a href="https://arxiv.org/abs/1811.10278">
                    Ahmadi (2018): rule-based Kurdish transliteration and its ambiguities
                  </a>
                </li>
                <li>
                  <a href={`${REPO_URL}/blob/main/CONTRIBUTING.md`}>Contribution guidelines</a> and{" "}
                  <a href={`${REPO_URL}/issues`}>GitHub issues</a>
                </li>
              </ul>
              <p>
                Spelling checks are available in the workspace. OCR, translation, and full grammar
                checking are not included.
              </p>
            </section>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
