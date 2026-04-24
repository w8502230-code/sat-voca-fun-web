/**
 * Lemmas in words-list-base.json not present in merged content txts (sample fm DOUBAO* + gap*.txt); flag script fallbacks.
 * Usage: node scripts/export-uncovered-fallback-lemmas.mjs [--out ../data/uncovered-doubao-gap-fallback-lemmas.txt]
 */
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const defaultOut = path.resolve(root, "..", "data", "uncovered-doubao-gap-fallback-lemmas.txt");

const args = process.argv.slice(2);
let outPath = defaultOut;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--out" && args[i + 1]) {
    outPath = path.resolve(args[(i += 1)]);
  }
}

const DOUBAO_FILES = [
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

async function loadDoubaoLemmaSet() {
  const set = new Set();
  for (const rel of DOUBAO_FILES) {
    const abs = path.resolve(root, rel);
    const text = await fs.readFile(abs, "utf8");
    for (const block of parseBlocks(text)) {
      const row = parseBlock(block);
      if (row.lemma) set.add(String(row.lemma).trim().toLowerCase());
    }
  }
  return set;
}

const normalize = (v) => String(v ?? "").trim();

function safeBucket(raw) {
  const lower = normalize(raw).toLowerCase();
  if (!lower) return "";
  if (lower.startsWith("noun")) return "n.";
  if (lower.startsWith("verb")) return "v.";
  if (lower.startsWith("adjective")) return "adj.";
  if (lower.startsWith("adverb")) return "adv.";
  return lower.slice(0, 8);
}

function inferPosFromLemma(lemma) {
  if (lemma.includes(" ")) return "other";
  if (lemma.endsWith("ly")) return "adv.";
  if (lemma.endsWith("ing") || lemma.endsWith("ed") || lemma.endsWith("ize") || lemma.endsWith("ise")) return "v.";
  if (
    lemma.endsWith("ous") ||
    lemma.endsWith("ful") ||
    lemma.endsWith("able") ||
    lemma.endsWith("ible") ||
    lemma.endsWith("al") ||
    lemma.endsWith("ive")
  )
    return "adj.";
  if (
    lemma.endsWith("tion") ||
    lemma.endsWith("sion") ||
    lemma.endsWith("ment") ||
    lemma.endsWith("ness") ||
    lemma.endsWith("ity") ||
    lemma.endsWith("ism")
  )
    return "n.";
  return "n.";
}

function fallbackSatExample(lemma, pos) {
  if (safeBucket(pos) === "v.") return `Students often ${lemma} key ideas while reviewing SAT passages.`;
  if (safeBucket(pos) === "adj.") return `The passage used a ${lemma} tone to support its central claim.`;
  if (safeBucket(pos) === "adv.") return `The argument was presented ${lemma}, which improved clarity for readers.`;
  return `The word "${lemma}" appears frequently in SAT-style academic contexts.`;
}

function fallbackEnDef(lemma, pos) {
  const bucket = safeBucket(pos);
  if (bucket === "v.") return `to carry out an action expressed by "${lemma}" in context`;
  if (bucket === "adj.") return `having a quality associated with "${lemma}"`;
  if (bucket === "adv.") return `in a way associated with "${lemma}"`;
  return `a term associated with "${lemma}" in academic usage`;
}

function fallbackZhDef(lemma, pos) {
  const bucket = safeBucket(pos);
  if (bucket === "v.") return `表示“${lemma}”相关动作或行为`;
  if (bucket === "adj.") return `表示与“${lemma}”相关的性质`;
  if (bucket === "adv.") return `表示与“${lemma}”相关的方式`;
  return `与“${lemma}”相关的学术语境词义`;
}

function fallbackZhExampleSat(lemma, pos) {
  const bucket = safeBucket(pos);
  if (bucket === "v.") return `在 SAT 阅读语境中，学生经常需要${lemma}关键信息。`;
  if (bucket === "adj.") return `这段文字使用了较为${lemma}的语气来支持中心论点。`;
  if (bucket === "adv.") return `该论证以${lemma}的方式展开，从而提升了表达清晰度。`;
  return `词汇“${lemma}”常见于 SAT 风格的学术文本中。`;
}

function isPlaceholder(value) {
  const v = normalize(value);
  if (!v) return true;
  return v.includes("待精修") || v.includes("a concept or usage related to");
}

function isGenericCnDef(lemma, cn) {
  const v = normalize(cn);
  if (!v) return true;
  if (v.includes("相关的学术语境词义")) return true;
  if (v.includes("表示与") && (v.includes("相关的性质") || v.includes("相关的方式"))) return true;
  if (v.includes("表示“") && v.includes("”相关动作或行为")) return true;
  return false;
}

function isGenericEnSat(sat) {
  return normalize(sat).includes("appears frequently in SAT-style academic contexts");
}

function isGenericZhSat(zh) {
  const v = normalize(zh);
  if (!v) return true;
  return v.includes("常见于 SAT 风格的学术文本");
}

function usesScriptFallback(w, lemma, pos) {
  const enDef = normalize(w.enDef);
  const enSat = normalize(w.enExampleSat);
  const cnDef = normalize(w.cnDef);
  const zhSat = normalize(w.zhExampleSat);

  if (isPlaceholder(w.enDef) || isPlaceholder(w.cnDef) || isPlaceholder(w.enExampleSat) || isPlaceholder(w.zhExampleSat))
    return true;
  if (enDef === fallbackEnDef(lemma, pos) && enDef) return true;
  if (enSat === fallbackSatExample(lemma, pos) && enSat) return true;
  if (cnDef === fallbackZhDef(lemma, pos) && cnDef) return true;
  if (zhSat === fallbackZhExampleSat(lemma, pos) && zhSat) return true;
  if (isGenericCnDef(lemma, w.cnDef)) return true;
  if (isGenericEnSat(w.enExampleSat)) return true;
  if (isGenericZhSat(w.zhExampleSat)) return true;
  return false;
}

const doubaoLemmas = await loadDoubaoLemmaSet();
const jsonPath = path.resolve(root, "data", "words-list-base.json");
const words = JSON.parse(await fs.readFile(jsonPath, "utf8"));

const uncovered = [];
for (const w of words) {
  const lemma = normalize(w.lemma);
  if (!lemma) continue;
  if (doubaoLemmas.has(lemma.toLowerCase())) continue;
  const pos = w.pos || inferPosFromLemma(lemma);
  uncovered.push({ w, lemma, pos });
}

const withFallback = uncovered.filter(({ w, lemma, pos }) => usesScriptFallback(w, lemma, pos));
withFallback.sort((a, b) => a.lemma.localeCompare(b.lemma));

const header = [
  `# 未覆盖：words-list-base.json 中有，但不在合并用 txt（DOUBAO* + gap*.txt，与 apply:doubao 一致）任一文中的 lemma。`,
  `# 总计 uncovered: ${uncovered.length}`,
  `# 其中仍匹配 enrich-word-details 兜底/泛化模板（任一）: ${withFallback.length}`,
  `# 列表仅包含「仍含兜底/泛化」的 lemma，每行一词`,
  "",
];

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, [...header, ...withFallback.map(({ lemma }) => lemma)].join("\n"), "utf8");

console.log(`Doubao-covered lemmas in txt: ${doubaoLemmas.size}`);
console.log(`Words in JSON: ${words.length}`);
console.log(`Uncovered by Doubao txts: ${uncovered.length}`);
console.log(`…of which still script fallback / generic (any): ${withFallback.length}`);
console.log(`Wrote: ${outPath}`);
