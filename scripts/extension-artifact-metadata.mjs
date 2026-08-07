import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";
import process from "node:process";

const root = process.cwd();
const metadataPath = resolve(root, "extension-dist/build-metadata.json");
const inputPaths = [
  "extension/public",
  "extension/src",
  "package-lock.json",
  "package.json",
  "postcss.config.mjs",
  "tsconfig.json",
  "vite.background.config.ts",
  "vite.extension.config.ts",
];

const files = inputPaths
  .flatMap((inputPath) => collectFiles(resolve(root, inputPath)))
  .sort((left, right) => relative(root, left).localeCompare(relative(root, right)));
const hash = createHash("sha256");

for (const file of files) {
  const path = relative(root, file).replaceAll("\\", "/");
  const content = readFileSync(file, "utf8").replaceAll("\r\n", "\n");
  hash.update(`${path}\0${content}\0`);
}

const metadata = `${JSON.stringify({
  schemaVersion: 1,
  sourceFingerprint: hash.digest("hex"),
}, null, 2)}\n`;

if (process.argv.includes("--check")) {
  if (!existsSync(metadataPath) || readFileSync(metadataPath, "utf8") !== metadata) {
    console.error("Extension artifact metadata is stale. Run npm run build:extension.");
    process.exitCode = 1;
  }
} else {
  writeFileSync(metadataPath, metadata, "utf8");
}

function collectFiles(path) {
  if (!existsSync(path)) {
    return [];
  }

  if (statSync(path).isFile()) {
    return [path];
  }

  const entries = readdirSync(path, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const entryPath = resolve(path, entry.name);
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
  });
}
