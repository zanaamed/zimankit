# zimankit

The text-processing library behind [ZimanKit](https://zimankit.sorinlab.com). It handles Unicode normalization, Kurdish character variants, spacing, script detection, text counts, and experimental Arabic/Latin transliteration.

This package has no React or network dependency. The writing workspace's Hunspell spelling checks, personal dictionaries, and document tools are separate.

## Install from the repository

The package isn't published to npm yet. From the repository root:

```sh
npm ci
npm run build:core
npm pack --workspace zimankit
```

Install the resulting `zimankit-0.1.0.tgz` in your project. Node.js 22+ or a modern browser with `Intl.Segmenter` and well-formed Unicode string APIs is required.

## Example

```ts
import { processText, detectScript, getStatistics } from "zimankit";

const result = processText("كوردی", {
  language: "sorani",
  operation: "normalize",
});

console.log(result.text); // کوردی
console.log(result.changes);

detectScript("سڵاو / Silav").kind; // mixed
getStatistics("👩‍💻").characters; // 1
```

With no options, `processText` uses Unicode-only normalization. Select `sorani` to replace `ك → ک` and `ي → ی`, or `kurmanji` to preserve Latin accents and case. Other letters, digits, and diacritics stay intact.

Inputs are limited to 20,000 UTF-16 code units. Invalid options and malformed Unicode are rejected. Transliteration produces a draft for review; it does not translate text or reconstruct unwritten vowels.

See the [library reference](https://github.com/zanaamed/zimankit/blob/main/docs/DEVELOPMENT.md#use-the-library) for options, mapping conventions, and counting rules.

## License

[MIT](LICENSE). This package does not bundle the workspace's separately licensed Kurdish dictionaries or KLPT data.
