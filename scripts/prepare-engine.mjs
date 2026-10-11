import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const manifest = JSON.parse(
  await readFile(new URL("../public/licenses/resources.json", import.meta.url), "utf8"),
);
for (const file of manifest.files) {
  const bytes = await readFile(new URL(`../public/${file.path}`, import.meta.url));
  if (createHash("sha256").update(bytes).digest("hex") !== file.sha256)
    throw new Error(
      `Upstream resource changed: ${file.path}. Review and update provenance before building.`,
    );
}
const destination = new URL("../public/vendor/hunspell/", import.meta.url);
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const runtimePath = fileURLToPath(destination);
if (resolve(runtimePath) !== resolve(projectRoot, "public", "vendor", "hunspell"))
  throw new Error("Unexpected generated engine directory.");
await rm(runtimePath, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const path of [
  "dist/Hunspell.js",
  "dist/Utilities.js",
  "dist/WasmMemoryManager.js",
  "dist/Utf8.js",
  "wasm/hunspell.js",
  "wasm/hunspell.wasm",
  "COPYING",
  "COPYING.LESSER",
  "COPYING.MPL",
  "README.md",
]) {
  await mkdir(new URL(".", new URL(path, destination)), { recursive: true });
  await cp(
    new URL(`../node_modules/hunspell-wasm/${path}`, import.meta.url),
    new URL(path, destination),
    { recursive: true },
  );
}
console.log("Prepared Hunspell browser runtime and license files.");
