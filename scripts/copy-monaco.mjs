import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const packageFile = path.resolve(
  path.dirname(require.resolve("monaco-editor")),
  "../../package.json",
);
const { version } = JSON.parse(await readFile(packageFile, "utf8"));
const source = path.join(path.dirname(packageFile), "min/vs");
const destination = fileURLToPath(
  new URL("../apps/web/public/monaco/vs", import.meta.url),
);
const versionFile = path.join(destination, "..", ".version");
let current;
try {
  current = await readFile(versionFile, "utf8");
} catch {
  /* First build. */
}
if (current !== version) {
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true });
  await writeFile(versionFile, version);
}
console.log("Optional Monaco editor assets are available locally.");
