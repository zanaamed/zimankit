# Development notes

Library usage, text rules, API contracts, and deployment details for ZimanKit. For the writing workspace, see the [user documentation](https://zimankit.sorinlab.com/docs/).

## Use the library

The text engine is in `packages/core`. It doesn't need React or a cloud service. It isn't on npm yet, but you can build and pack it from this checkout:

```sh
npm run build:core
npm pack --workspace zimankit
```

Then install the archive in another project:

```sh
npm install /path/to/zimankit/zimankit-0.1.0.tgz
```

```ts
import { processText, detectScript, getStatistics } from "zimankit";

const result = processText("كوردی", {
  language: "sorani",
  operation: "normalize",
});

console.log(result.text);     // کوردی
console.log(result.original); // كوردی
console.log(result.changes);
console.log(result.warnings);

processText("C\u0327 e\u0302", { language: "kurmanji" }).text; // Ç ê
detectScript("سڵاو / Silav").kind; // mixed
getStatistics("👩‍💻").characters; // 1
```

Without options, `processText` uses `unicode` and `normalize`. Pass `language: "sorani"` if you want the Sorani character replacements. You get the original text back along with the result, script info, statistics, changes, warnings, and engine version.

The package builds ES modules, CommonJS, and TypeScript declarations. It needs a runtime with `Intl.Segmenter` and well-formed Unicode string APIs, such as Node.js 22+ or a modern browser.

### Options

| Option | Default / behavior |
| --- | --- |
| `language` | `unicode`; also accepts `sorani` and `kurmanji`. |
| `operation` | `normalize`; also accepts `clean` and `transliterate`. |
| `direction` | Required for transliteration: `arabic-to-latin` or `latin-to-arabic`. |
| `kurdishVariants` | `true`; applies only to Sorani normalization. |
| `collapseSpaces` | `true`; collapses ordinary spaces and tabs. |
| `normalizeLineEndings` | `true`; converts CRLF and CR to LF. |
| `trimLines` | `false`; trims ordinary spaces and tabs at line edges. |
| `punctuationSpacing` | `false`; removes spaces before selected punctuation. |
| `removeTatweel` | `false`; removes Arabic elongation marks. |
| `removeControls` | `false`; removes selected invisible formatting controls. |

The cleaning flags only affect `clean`. That operation does NFC normalization, but it doesn't replace Sorani character variants. Run `normalize` first if you need both. Invalid options and malformed Unicode are rejected. The library and original `/tools/` playground limit each input to **20,000 UTF-16 code units**.

## Core library text rules and limitations

These rules describe the library and original text tools. The workspace offers additional, separately reviewed cleanup rules from KLPT.

I kept the Sorani replacements to two mappings for now: **`ك → ک`** and **`ي → ی`**. Letters like `ه/ە`, `ر/ڕ`, and `ل/ڵ` are left alone. So are vowels, diacritics, digits, and case. Kurmanji normalization keeps accents and capitalization while composing equivalent Unicode sequences.

One thing to watch: Sorani replacements also affect Arabic quotations inside the input. Pick `unicode` if you need to keep those spellings. Normalization uses NFC, without applying NFKC across the text.

Joiners, non-joiners, emoji sequences, and non-breaking spaces stay intact. Formatting-control removal is optional; those characters can affect direction and word boundaries. Legacy font encodings and Arabic presentation forms aren't converted yet. Presentation forms are flagged in the report.

### Experimental transliteration

I'm treating transliteration as a draft to review. It changes the writing system without translating the text. The mapping follows an extended Hawar-style convention used by this project: `ç`, `ş`, `ê`, `î`, and `û`, plus `ł`, `ř`, `ḥ`, `ẍ`, and `ʿ` for particular Arabic-script letters.

Arabic-to-Latin output marks ambiguous letters: single `و` becomes `{w/u}`, `ی/ي` becomes `{y/î}`, and double `وو` becomes `û`. Unwritten short **i (bizroke)** isn't reconstructed. For example, `کوردی` becomes `k{w/u}rd{y/î}`.

Going from Latin to Arabic uses Sorani-style Arabic spelling. You lose capitalization and short i, and some distinctions merge, so converting back won't recover the original. Unmapped characters stay in the output and are flagged. Check names and mixed-language passages carefully.

### Statistics

Characters are counted as grapheme clusters: an emoji sequence can count as one character. Code points have a separate count. Words are runs of Unicode letters and numbers, split by punctuation and hyphens. Sentence counts are approximate, especially around abbreviations and URLs.

Change counts add up changed spans across rules, with up to four examples for each rule. Statistics refer to the processed text. The tests check these rules, but there's no independently measured linguistic accuracy score.

## REST API

The Cloudflare Worker exposes `GET /api/v1/health` and `POST /api/v1/process`, with CORS support.

```sh
curl https://zimankit.sorinlab.com/api/v1/process \
  -H 'Content-Type: application/json' \
  --data '{"text":"كوردی","options":{"language":"sorani","operation":"normalize"}}'
```

Responses use the same result structure as the library. Errors return `{ "error": "message" }`: 400 for invalid JSON or options, 404 for unknown endpoints, 405 for the wrong method, 413 for oversized input, and 415 for the wrong media type.

The API accepts **2,000 UTF-16 code units** per input and request bodies up to **100,000 bytes**. Submitted text isn't stored by the app or written to application request logs. Responses aren't cached. The browser playground doesn't call this endpoint; it runs the engine locally.

## Project structure and deployment

```text
packages/core/   TypeScript text-processing engine
components/      Writing workspace, original playground, shared UI
lib/workbench/   Browser analysis, cleanup, files, and worker client
app/             Next.js pages and documentation
worker/          REST API and static asset serving
tests/           Core, API, workspace, and actual Hunspell tests
public/          Dictionaries, KLPT data, worker, licenses, and fonts
scripts/         Verify pinned resources and prepare Hunspell assets
```

Next.js builds the frontend into `out/`. A Cloudflare Worker serves the API alongside the static site. The workspace runs Hunspell in a background browser worker. No paid language service, database, or AI account is required.

To deploy your own copy, update the Worker name and domain in `wrangler.jsonc`, then run:

```sh
npx wrangler login
npm run deploy
```

If you don't have a custom domain, remove that route and set `workers_dev: true` for a `workers.dev` address. You can also just upload `out/` to a static host. That gives you the workspace and text tools, but you'll still need the Worker for the API. API traffic counts toward your account's Workers limits.

