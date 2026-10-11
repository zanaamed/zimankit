# Contributing

Kurdish examples and corrections are welcome, especially for regional vocabulary and spelling conventions.

## Reporting a problem

Open an issue with:

- A short input and the language or tool you selected.
- The result you got and what you expected.
- A spelling reference or explanation, if you have one.

Mention mixed-language passages, names, or regional spellings when they matter. Use a small example without private document content.

## Working on the code

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
npm run check
```

For the API, run `npm run preview` after building. The Next.js dev server only serves the frontend. [Development notes](docs/DEVELOPMENT.md) describe the library and deployment.

For a new text rule, include an example, the reason for the change, and a regression test. Keep distinct Kurdish letters separate and preserve the original input in reports. If a conversion is ambiguous, show that ambiguity instead of guessing silently.

Keep the core library independent of the UI and network. For interface changes, check keyboard use, small screens, and both writing directions. Update the docs when defaults, limits, or results change.

Dictionary files and KLPT data are pinned to upstream versions. If you update them, keep their licenses and update the hashes and source commits in `public/licenses/resources.json`.

Code contributions use the project's MIT license. Third-party data and software retain their own licenses.
