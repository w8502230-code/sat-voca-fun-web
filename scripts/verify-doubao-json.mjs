/**
 * Verify words-list-base.json matches merged content from the same txt list as apply:doubao.
 * Usage: node scripts/verify-doubao-json.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const jsonPath = path.resolve(root, "data", "words-list-base.json");

const TXT_FILES = [
  "../data/sample fm DOUBAO 100.txt",
  "../data/sample fm DOUBAO 200.txt",
  "../data/sample fm DOUBAO 371.txt",
  "../data/sample fm DOUBAO 500.txt",
  "../data/sample fm DOUBAO 650.txt",
  "../data/sample fm DOUBAO 800.txt",
  "../data/sample fm DOUBAO 948.txt",
  "../data/sample fm DOUBAO 1090.txt",
  "../data/sample fm DOUBAO 1250.txt",
  "../data/sample fm DOUBAO 1400.txt",
  "../data/sample fm DOUBAO 1550.txt",
  "../data/sample fm DOUBAO 1717.txt",
  "../data/sample fm DOUBAO 1850.txt",
  "../data/sample fm DOUBAO 2000.txt",
  "../data/sample fm DOUBAO 2034.txt",
  "../data/gap161.txt",
  "../data/gap300.txt",
  "../data/gap363.txt",
  "../data/gap500.txt",
  "../data/gap650.txt",
  "../data/gap712.txt",
  "../data/gap733.txt",
];

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
    if (m) row[m[1]] = m[2];
  }
  return row;
}

async function buildExpectedMap() {
  const map = new Map();
  for (const rel of TXT_FILES) {
    const abs = path.resolve(root, rel);
    const text = await fs.readFile(abs, "utf8");
    for (const block of parseBlocks(text)) {
      const row = parseBlock(block);
      if (!row.lemma) continue;
      const lemma = row.lemma.trim();
      if (!lemma) continue;
      if (!row.enDef || !row.enExampleSat || !row.cnDef || !row.zhExampleSat) continue;
      map.set(lemma, {
        enDef: row.enDef.trim(),
        enExampleSat: row.enExampleSat.trim(),
        cnDef: row.cnDef.trim(),
        zhExampleSat: row.zhExampleSat.trim(),
      });
    }
  }
  return map;
}

const normalize = (s) => String(s ?? "").trim();

const expected = await buildExpectedMap();
const words = JSON.parse(await fs.readFile(jsonPath, "utf8"));
const index = new Map(words.map((w, i) => [normalize(w.lemma).toLowerCase(), i]));

const mismatches = [];
const notInJson = [];

for (const [lemma, exp] of expected) {
  const key = lemma.toLowerCase();
  const i = index.get(key);
  if (i === undefined) {
    notInJson.push(lemma);
    continue;
  }
  const w = words[i];
  const fields = ["enDef", "enExampleSat", "cnDef", "zhExampleSat"];
  for (const f of fields) {
    if (normalize(w[f]) !== exp[f]) {
      mismatches.push({
        lemma,
        field: f,
        expected: exp[f],
        actual: normalize(w[f]),
      });
    }
  }
}

console.log(`Expected lemmas from txts: ${expected.size}`);
console.log(`Mismatches vs JSON: ${mismatches.length}`);
console.log(`Txt lemmas not in JSON: ${notInJson.length}`);

if (mismatches.length) {
  console.log("\nFirst 15 mismatches:");
  for (const m of mismatches.slice(0, 15)) {
    console.log(`--- ${m.lemma} :: ${m.field}`);
    console.log(`  expected: ${m.expected.slice(0, 120)}${m.expected.length > 120 ? "…" : ""}`);
    console.log(`  actual:   ${m.actual.slice(0, 120)}${m.actual.length > 120 ? "…" : ""}`);
  }
  if (mismatches.length > 15) console.log(`… and ${mismatches.length - 15} more`);
  process.exitCode = 1;
} else {
  console.log("OK: all mergeable lemmas match JSON for enDef / enExampleSat / cnDef / zhExampleSat.");
}

let genericSat = 0;
for (const w of words) {
  if (normalize(w.enExampleSat).includes("appears frequently in SAT-style academic contexts")) genericSat += 1;
}
console.log(`\nRows with generic enExampleSat phrase: ${genericSat} / ${words.length}`);

if (genericSat > 0) process.exitCode = 1;
