/**
 * Merge Doubao block-format .txt into words-list-base.json (lemma, enDef, enExampleSat, cnDef, zhExampleSat).
 * Usage:
 *   node scripts/apply-doubao-overrides.mjs --input data/words-list-base.json [--report data/imports/doubao-merge-report.txt] file1.txt file2.txt
 * Later files win on duplicate lemmas.
 */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
let jsonPath = path.resolve("data/words-list-base.json");
let reportPath = null;
const txtPaths = [];
for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === "--input") {
    i += 1;
    if (args[i]) jsonPath = path.resolve(args[i]);
    continue;
  }
  if (a === "--report") {
    i += 1;
    if (args[i]) reportPath = path.resolve(args[i]);
    continue;
  }
  if (!a.startsWith("--")) txtPaths.push(path.resolve(a));
}

if (txtPaths.length === 0) {
  console.error(
    "Usage: node scripts/apply-doubao-overrides.mjs --input data/words-list-base.json [--report data/imports/doubao-merge-report.txt] <file1.txt> [file2.txt ...]",
  );
  process.exit(1);
}

const FIELD_RE = /^(lemma|enDef|enExampleSat|cnDef|zhExampleSat):\s*(.*)$/;

function parseBlocks(text) {
  const raw = String(text).replace(/\r\n/g, "\n").trim();
  if (!raw) return [];
  return raw.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
}

function parseBlock(block) {
  const row = {};
  for (const line of block.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const m = FIELD_RE.exec(t);
    if (!m) {
      console.warn("Skip unrecognized line:", t.slice(0, 80));
      continue;
    }
    row[m[1]] = m[2];
  }
  return row;
}

async function mergeFiles(paths) {
  const map = new Map();
  for (const p of paths) {
    const abs = path.resolve(p);
    const text = await fs.readFile(abs, "utf8");
    const blocks = parseBlocks(text);
    let n = 0;
    for (const block of blocks) {
      const row = parseBlock(block);
      if (!row.lemma) continue;
      const lemma = row.lemma.trim();
      if (!lemma) continue;
      if (!row.enDef || !row.enExampleSat || !row.cnDef || !row.zhExampleSat) {
        console.warn(`Incomplete block for lemma "${lemma}" in ${abs}`);
        continue;
      }
      map.set(lemma, {
        lemma,
        enDef: row.enDef,
        enExampleSat: row.enExampleSat,
        cnDef: row.cnDef,
        zhExampleSat: row.zhExampleSat,
      });
      n += 1;
    }
    console.log(`${abs}: ${blocks.length} blocks → ${n} valid rows (unique lemmas so far: ${map.size})`);
  }
  return map;
}

const byLemma = await mergeFiles(txtPaths);

const rawJson = await fs.readFile(jsonPath, "utf8");
const words = JSON.parse(rawJson);
const index = new Map(words.map((w, i) => [String(w.lemma ?? "").trim().toLowerCase(), i]));

let applied = 0;
const missing = [];
const appliedLemmas = [];

for (const [lemma, row] of byLemma) {
  const key = lemma.toLowerCase();
  const i = index.get(key);
  if (i === undefined) {
    missing.push(lemma);
    continue;
  }
  words[i].enDef = row.enDef;
  words[i].enExampleSat = row.enExampleSat;
  words[i].cnDef = row.cnDef;
  words[i].zhExampleSat = row.zhExampleSat;
  applied += 1;
  appliedLemmas.push(lemma);
}

await fs.writeFile(jsonPath, JSON.stringify(words, null, 2), "utf8");

console.log("");
console.log(`Input lemmas in txt (unique): ${byLemma.size}`);
console.log(`Applied to words-list-base.json: ${applied}`);
console.log(`Not found in JSON (skipped): ${missing.length}`);
if (missing.length) {
  console.log("Missing lemmas (first 40):", missing.slice(0, 40).join(", "));
  if (missing.length > 40) console.log(`… and ${missing.length - 40} more`);
}
console.log(`Wrote: ${jsonPath}`);

if (reportPath) {
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  const lines = [
    `generatedAt: ${new Date().toISOString()}`,
    `json: ${jsonPath}`,
    `txt: ${txtPaths.join(" | ")}`,
    "",
    `unique lemmas in txt: ${byLemma.size}`,
    `applied: ${applied}`,
    `skipped (not in json): ${missing.length}`,
    "",
    "--- applied lemmas ---",
    ...appliedLemmas.sort((a, b) => a.localeCompare(b)),
    "",
    "--- skipped lemmas ---",
    ...missing.sort((a, b) => a.localeCompare(b)),
    "",
  ];
  await fs.writeFile(reportPath, lines.join("\n"), "utf8");
  console.log(`Report: ${reportPath}`);
}
