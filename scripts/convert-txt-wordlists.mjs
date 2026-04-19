import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const idx = args.findIndex((a) => a === name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
};

const inputDir = path.resolve(argValue("--input", "../data"));
const outputDir = path.resolve(argValue("--output", "data/imports"));
const mergedOutput = path.resolve(argValue("--merged", "data/imports/words-list-all.json"));

const isTxtFile = (file) => file.toLowerCase().endsWith(".txt");
const toJsonName = (fileName) =>
  fileName
    .replace(/\.txt$/i, ".json")
    .replace(/^SAT_/i, "")
    .replace(/^sat_/i, "")
    .replace(/words_list/gi, "words-list");

const normalizeLemma = (line) => line.trim().toLowerCase();

function toWordTemplate(lemma) {
  return {
    lemma,
    pos: "",
    cnDef: "",
    enDef: "",
    enExampleSat: "",
    zhExampleSat: "",
    enExampleTheme: "",
    zhExampleTheme: "",
  };
}

const entries = await fs.readdir(inputDir, { withFileTypes: true });
const txtFiles = entries.filter((e) => e.isFile() && isTxtFile(e.name)).map((e) => e.name);

if (txtFiles.length === 0) {
  console.error(`No .txt files found in ${inputDir}`);
  process.exit(1);
}

await fs.mkdir(outputDir, { recursive: true });

const mergedMap = new Map();
let totalRawLines = 0;
let totalValidLemmas = 0;

for (const fileName of txtFiles) {
  const filePath = path.join(inputDir, fileName);
  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  totalRawLines += lines.length;

  const lemmas = [];
  const fileSeen = new Set();
  for (const line of lines) {
    const lemma = normalizeLemma(line);
    if (!lemma) continue;
    if (lemma.startsWith("#")) continue;
    if (fileSeen.has(lemma)) continue;
    fileSeen.add(lemma);
    lemmas.push(lemma);
    if (!mergedMap.has(lemma)) mergedMap.set(lemma, toWordTemplate(lemma));
  }

  totalValidLemmas += lemmas.length;
  const words = lemmas.map((lemma) => toWordTemplate(lemma));
  const outputPath = path.join(outputDir, toJsonName(fileName));
  await fs.writeFile(outputPath, JSON.stringify(words, null, 2), "utf8");
  console.log(`${fileName} -> ${path.basename(outputPath)} (${words.length} words)`);
}

const mergedWords = [...mergedMap.values()].sort((a, b) => a.lemma.localeCompare(b.lemma));
await fs.writeFile(mergedOutput, JSON.stringify(mergedWords, null, 2), "utf8");

console.log("");
console.log(`Source dir: ${inputDir}`);
console.log(`Output dir: ${outputDir}`);
console.log(`TXT files: ${txtFiles.length}`);
console.log(`Raw lines: ${totalRawLines}`);
console.log(`Per-file valid lemmas total: ${totalValidLemmas}`);
console.log(`Merged unique lemmas: ${mergedWords.length}`);
console.log(`Merged file: ${mergedOutput}`);
