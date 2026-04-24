/**
 * Scan words-list-base.json for placeholder-style cnDef/enDef patterns.
 * Merge better definitions from data/imports/dictionary-cache-online.json when usable.
 * Apply manual overrides for lemmas where cache is wrong or empty.
 * Writes report files under data/imports/.
 *
 * Usage: node scripts/fix-placeholder-definitions.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const basePath = path.join(root, "data", "words-list-base.json");
const cachePath = path.join(root, "data", "imports", "dictionary-cache-online.json");
const reportPath = path.join(root, "data", "imports", "placeholder-definitions-still-needed.txt");
const partialPath = path.join(root, "data", "imports", "placeholder-fix-en-only-needs-cn.txt");
const statsPath = path.join(root, "data", "imports", "placeholder-fix-stats.txt");

const isPlaceholderEn = (s) => {
  if (!s || typeof s !== "string") return true;
  const t = s.trim();
  if (!t) return true;
  if (/^a term associated with "/i.test(t)) return true;
  if (/^to perform or apply "/i.test(t)) return true;
  if (/^in a manner related to "/i.test(t)) return true;
  return false;
};

const isPlaceholderCn = (s) => {
  if (!s || typeof s !== "string") return true;
  const t = s.trim();
  if (!t) return true;
  if (/相关动作或行为/.test(t)) return true;
  if (/表示与[“"][^”"]+[”"]相关的性质/.test(t)) return true;
  if (/与[“"][^”"]+[”"]相关的学术语境词义/.test(t)) return true;
  if (/相关的学术语境词义/.test(t)) return true;
  return false;
};

/** Cache is usable for en if not placeholder; for cn if non-empty and not placeholder. */
const cacheEnOk = (c) => c && typeof c.enDef === "string" && !isPlaceholderEn(c.enDef);
const cacheCnOk = (c) => c && typeof c.cnDef === "string" && !isPlaceholderCn(c.cnDef);

/** Manual fixes where online cache is wrong (e.g. IT-only agent) or empty. */
const manualOverrides = {
  agent: {
    pos: "n.",
    enDef:
      "A person who acts on behalf of another; a representative; one who brings something about; (chemistry) a substance that produces an effect.",
    cnDef: "代理人；代表；促成某事的人或因素；（化学）作用剂。",
  },
  alarmed: {
    pos: "adj.",
    enDef: "Frightened or worried; feeling sudden concern or fear.",
    cnDef: "受惊的；担心的；感到不安的。",
  },
  alarming: {
    pos: "adj.",
    enDef: "Causing worry or fear; disturbing.",
    cnDef: "令人担忧的；使人惊恐的。",
  },
};

function main() {
  const raw = fs.readFileSync(basePath, "utf8");
  /** @type {Array<Record<string, unknown>>} */
  const words = JSON.parse(raw);
  const cacheRaw = fs.readFileSync(cachePath, "utf8");
  /** @type {Record<string, Record<string, unknown> | null>} */
  const cache = JSON.parse(cacheRaw);

  let countPlaceholderBefore = 0;
  let countFixedManual = 0;
  let countFixedEn = 0;
  let countFixedCn = 0;
  const enOnlyNeedsCn = [];
  const stillBad = [];

  for (const w of words) {
    const lemma = w.lemma;
    if (typeof lemma !== "string") continue;

    const badBefore = isPlaceholderEn(w.enDef) || isPlaceholderCn(w.cnDef);
    if (badBefore) countPlaceholderBefore += 1;

    if (manualOverrides[lemma]) {
      const o = manualOverrides[lemma];
      if (o.pos) w.pos = o.pos;
      w.enDef = o.enDef;
      w.cnDef = o.cnDef;
      countFixedManual += 1;
      continue;
    }

    const c = cache[lemma];
    if (!c || c === null) {
      if (badBefore) stillBad.push({ lemma, reason: "no cache entry" });
      continue;
    }

    let fixedEn = false;
    if (isPlaceholderEn(w.enDef) && cacheEnOk(c)) {
      w.enDef = c.enDef;
      fixedEn = true;
      countFixedEn += 1;
    }
    if (isPlaceholderCn(w.cnDef) && cacheCnOk(c)) {
      w.cnDef = c.cnDef;
      countFixedCn += 1;
    }
    if (fixedEn && typeof c.pos === "string" && c.pos.trim()) {
      w.pos = c.pos;
    }

    const enBad = isPlaceholderEn(w.enDef);
    const cnBad = isPlaceholderCn(w.cnDef);
    if (enBad) {
      stillBad.push({
        lemma,
        reason: cnBad ? "enDef and cnDef still placeholder or empty" : "enDef still placeholder or empty",
      });
    } else if (cnBad) {
      enOnlyNeedsCn.push(lemma);
    }
  }

  fs.writeFileSync(basePath, `${JSON.stringify(words, null, 2)}\n`, "utf8");

  const stats = [
    `Total words in base: ${words.length}`,
    `Entries with placeholder en OR cn (before): ${countPlaceholderBefore}`,
    `Manual overrides applied: ${countFixedManual}`,
    `enDef merged from cache: ${countFixedEn}`,
    `cnDef merged from cache: ${countFixedCn}`,
    `Still need attention (see placeholder-definitions-still-needed.txt): ${stillBad.length}`,
    `enDef fixed but cnDef still missing (see placeholder-fix-en-only-needs-cn.txt): ${enOnlyNeedsCn.length}`,
  ].join("\n");

  fs.writeFileSync(statsPath, `${stats}\n`, "utf8");

  const stillHeader =
    [
      "# 仍缺可用英文释义（无缓存或缓存英文仍为占位）",
      "# 格式：lemma<TAB>reason",
      "",
    ].join("\n");
  const stillLines = stillBad
    .map(({ lemma, reason }) => `${lemma}\t${reason}`)
    .sort()
    .join("\n");
  fs.writeFileSync(reportPath, `${stillHeader}${stillLines}\n`, "utf8");

  const partialHeader =
    [
      "# 英文已从 dictionary-cache-online.json 修复，但中文释义仍缺失或为占位模板",
      "# 需后续人工翻译或从其它词源补 cnDef（每行一个 lemma）",
      "",
    ].join("\n");
  const partialLines = [...new Set(enOnlyNeedsCn)].sort().join("\n");
  fs.writeFileSync(partialPath, `${partialHeader}${partialLines}\n`, "utf8");

  console.log(stats);
  console.log(`Wrote: ${basePath}`);
  console.log(`Wrote: ${reportPath}`);
  console.log(`Wrote: ${partialPath}`);
  console.log(`Wrote: ${statsPath}`);
}

main();
