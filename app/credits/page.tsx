import { Header, Footer } from "@/components/chrome";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Sources & licenses",
  alternates: { canonical: "/credits/" },
};
export default function Credits() {
  return (
    <div className="site-frame">
      <Header active="credits" />
      <main id="main">
        <section className="hero docs-hero">
          <h1>Sources & licenses.</h1>
          <p>The people, language resources, and free software behind ZimanKit.</p>
        </section>
        <div className="credits-content docs-content">
          <section className="docs-section">
            <h2>Kurdish Hunspell</h2>
            <p>
              Sorani and Kurmanji dictionaries and word-building rules by{" "}
              <a href="https://sinaahmadi.github.io/">Sina Ahmadi</a>. Spelling suggestions and word
              analysis run on your device using Hunspell.
            </p>
            <p>
              <a href="https://github.com/sinaahmadi/KurdishHunspell/tree/88131d6878ef7fa3ee114aa554adc385ff85b44c">
                Source snapshot
              </a>{" "}
              · <a href="/licenses/KurdishHunspell.txt">CC BY-SA 4.0 license</a> ·{" "}
              <a href="https://arxiv.org/abs/2109.06374">Research paper</a>
            </p>
            <p>
              The dictionary files are redistributed unchanged. Recognition and suggestions reflect
              the upstream resources, which can miss regional vocabulary, names, and specialist
              terms.
            </p>
          </section>
          <section className="docs-section">
            <h2>Kurdish Language Processing Toolkit (KLPT)</h2>
            <p>
              By Sina Ahmadi. ZimanKit uses KLPT’s unchanged preparation-rule data and common-word
              lists. The browser interface applies selected rules as reviewable changes. The
              complete Python toolkit is not bundled, and the converter is ZimanKit’s own
              experimental implementation.
            </p>
            <p>
              <a href="https://github.com/sinaahmadi/klpt/tree/0fb7d35e8000a3f89ab8c727f2d1051d899c192f">
                Source snapshot
              </a>{" "}
              · <a href="/licenses/KLPT.txt">CC BY-SA 4.0 license</a> ·{" "}
              <a href="https://aclanthology.org/2020.nlposs-1.11/">KLPT research paper</a>
            </p>
          </section>
          <section className="docs-section">
            <h2>Software & licensing</h2>
            <p>
              ZimanKit’s code is MIT licensed. The Kurdish resources above keep their CC BY-SA 4.0
              licenses; they are excluded from the MIT grant. No endorsement by the original authors
              is implied.
            </p>
            <ul>
              <li>
                <a href="https://github.com/rotemdan/hunspell-wasm">hunspell-wasm 0.3.0</a>, by
                Rotem Dan, and the Hunspell contributors. Redistributed unchanged under the{" "}
                <a href="/vendor/hunspell/COPYING.MPL">MPL 1.1 option</a> of the upstream
                tri-license. <a href="/vendor/hunspell/README.md">Package information</a> and{" "}
                <a href="/licenses/hunspell-wasm-0.3.0-source.zip">
                  corresponding source and build instructions
                </a>
                .
              </li>
              <li>
                fflate (MIT) provides ZIP import and export. docx (MIT) creates Word documents.
              </li>
              <li>Next.js, React, Tailwind CSS (MIT), and Lucide (ISC) support the interface.</li>
              <li>Geist and Noto Sans Arabic fonts use the SIL Open Font License.</li>
            </ul>
            <p>
              <a href="/licenses/THIRD_PARTY_NOTICES.txt">Third-party notices</a>
            </p>
          </section>
          <section className="docs-section">
            <h2>Your documents</h2>
            <p>
              Writing, spelling, cleanup, word analysis, document imports, and exports run locally.
              Language files download from this site. Drafts and personal words are saved in this
              browser’s local storage and are not synced to an account. Download backups before
              clearing browser data.
            </p>
            <p>
              Word import extracts text and paragraphs. It does not preserve page layout, images,
              tables, comments, or tracked changes. Word export creates a new text document with
              writing direction set for the selected Kurdish variety.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
