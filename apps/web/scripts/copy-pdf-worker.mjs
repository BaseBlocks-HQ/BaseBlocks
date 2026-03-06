import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pdfjsDistPath = path.dirname(require.resolve("pdfjs-dist/package.json"));
const pdfWorkerPath = path.join(pdfjsDistPath, "build", "pdf.worker.min.mjs");
const publicDirectoryPath = path.resolve(import.meta.dirname, "../public");
const outputPath = path.join(publicDirectoryPath, "pdf.worker.min.mjs");

fs.mkdirSync(publicDirectoryPath, { recursive: true });
fs.copyFileSync(pdfWorkerPath, outputPath);
