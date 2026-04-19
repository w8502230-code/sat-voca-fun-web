import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const idx = args.findIndex((a) => a === name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
};

const hasFlag = (name) => args.includes(name);

const inputPath = path.resolve(argValue("--input", "data/words-list-base.json"));
const outputPath = path.resolve(argValue("--output", inputPath));
const cachePath = path.resolve(argValue("--cache", "data/imports/dictionary-cache.json"));
const limit = Number(argValue("--limit", "100000"));
const sleepMs = Number(argValue("--sleep-ms", "40"));
const fetchTimeoutMs = Number(argValue("--fetch-timeout-ms", "20000"));
const dryRun = hasFlag("--dry-run");
const offlineOnly = hasFlag("--offline-only");
const refinePlaceholders = !hasFlag("--no-refine-placeholders");
const refineTemplates = !hasFlag("--no-refine-templates");
const skipTranslation = hasFlag("--skip-translation");
const noGoogle = hasFlag("--no-google");
const forceRefetch = hasFlag("--force-refetch");
const saveEvery = Number(argValue("--save-every", "40"));
const concurrency = Math.max(1, Math.floor(Number(argValue("--concurrency", "8"))));
const skipLock = hasFlag("--skip-lock");
const retranslateOnly = hasFlag("--retranslate-only");
const lockFilePath = path.resolve(
  argValue("--lock-file", path.join(path.dirname(outputPath), ".enrich-word-details.lock")),
);

const normalize = (v) => String(v ?? "").trim();
const normalizeLemma = (v) => normalize(v).toLowerCase();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isPidRunning(pid) {
  const n = Number(pid);
  if (!Number.isFinite(n) || n <= 0) return false;
  if (n === process.pid) return true;
  try {
    if (process.platform === "win32") {
      const out = execSync(`tasklist /FI "PID eq ${n}" /NH`, { encoding: "utf8" });
      return out.includes(String(n));
    }
    process.kill(n, 0);
    return true;
  } catch {
    return false;
  }
}

function lockPayload() {
  return JSON.stringify(
    {
      pid: process.pid,
      outputPath,
      inputPath,
      cachePath,
      startedAt: new Date().toISOString(),
      argv: process.argv.slice(2),
    },
    null,
    2,
  );
}

async function acquireLock() {
  if (skipLock) return;
  await fs.mkdir(path.dirname(lockFilePath), { recursive: true });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await fs.writeFile(lockFilePath, lockPayload(), { flag: "wx" });
      return;
    } catch (e) {
      if (e?.code !== "EEXIST") throw e;
      try {
        const prev = JSON.parse(await fs.readFile(lockFilePath, "utf8"));
        if (!isPidRunning(prev.pid)) {
          await fs.unlink(lockFilePath);
          continue;
        }
      } catch {
        await fs.unlink(lockFilePath).catch(() => {});
        continue;
      }
      console.error("Another enrich-word-details run is already active for this output file.");
      console.error(`Lock file: ${lockFilePath}`);
      console.error("Stop the other process or wait for it to finish. Use --skip-lock only if you are sure.");
      process.exit(1);
    }
  }
}

async function releaseLock() {
  if (skipLock) return;
  try {
    const raw = await fs.readFile(lockFilePath, "utf8");
    const prev = JSON.parse(raw);
    if (prev.pid === process.pid) await fs.unlink(lockFilePath);
  } catch {
    /* already released or missing */
  }
}

process.once("SIGINT", () => {
  void releaseLock().finally(() => process.exit(130));
});

const jsonTimeoutMarker = Symbol("jsonTimeout");

async function fetchJson(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(fetchTimeoutMs) });
    if (!response.ok) return null;
    const parsed = await Promise.race([
      response.json(),
      sleep(fetchTimeoutMs).then(() => jsonTimeoutMarker),
    ]);
    if (parsed === jsonTimeoutMarker) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function fetchJsonWithRetry(url, retries = 3) {
  let last = null;
  for (let i = 0; i < retries; i += 1) {
    last = await fetchJson(url);
    if (last !== null) return last;
    await sleep(200 * (i + 1));
  }
  return null;
}

function safeBucket(raw) {
  const lower = normalize(raw).toLowerCase();
  if (!lower) return "";
  if (lower.startsWith("noun")) return "n.";
  if (lower.startsWith("verb")) return "v.";
  if (lower.startsWith("adjective")) return "adj.";
  if (lower.startsWith("adverb")) return "adv.";
  return lower.slice(0, 8);
}

function fallbackSatExample(lemma, pos) {
  if (safeBucket(pos) === "v.") return `Students often ${lemma} key ideas while reviewing SAT passages.`;
  if (safeBucket(pos) === "adj.") return `The passage used a ${lemma} tone to support its central claim.`;
  if (safeBucket(pos) === "adv.") return `The argument was presented ${lemma}, which improved clarity for readers.`;
  return `The word "${lemma}" appears frequently in SAT-style academic contexts.`;
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

const isPlaceholder = (value) => {
  const v = normalize(value);
  if (!v) return true;
  return v.includes("待精修") || v.includes("a concept or usage related to");
};

/** Offline / generic template rows that should be upgraded when running full refine */
function isGenericCnDef(lemma, cn) {
  const v = normalize(cn);
  if (!v) return true;
  if (v.includes("相关的学术语境词义")) return true;
  if (v.includes("表示与") && (v.includes("相关的性质") || v.includes("相关的方式"))) return true;
  if (v.includes("表示“") && v.includes("”相关动作或行为")) return true;
  return false;
}

function isGenericEnSat(sat) {
  const s = normalize(sat);
  return s.includes("appears frequently in SAT-style academic contexts");
}

function isGenericZhSat(zh) {
  const v = normalize(zh);
  if (!v) return true;
  return v.includes("常见于 SAT 风格的学术文本");
}

async function translateToZh(text) {
  if (skipTranslation) return "";
  if (!text) return "";
  const q = encodeURIComponent(text);

  if (!noGoogle) {
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${q}`;
    const gData = await fetchJsonWithRetry(googleUrl, 2);
    if (Array.isArray(gData) && Array.isArray(gData[0])) {
      const gText = gData[0].map((row) => (Array.isArray(row) ? row[0] : "")).join("").trim();
      if (gText) return gText;
    }
  }

  const mmUrl = `https://api.mymemory.translated.net/get?q=${q}&langpair=en|zh-CN`;
  const mmData = await fetchJsonWithRetry(mmUrl, 3);
  return normalize(mmData?.responseData?.translatedText);
}

function pickBestDefinition(lemma, entry) {
  const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
  const candidates = [];
  for (const m of meanings) {
    const defs = Array.isArray(m.definitions) ? m.definitions : [];
    for (const d of defs) {
      const enDef = normalize(d.definition);
      if (!enDef) continue;
      candidates.push({
        pos: safeBucket(m.partOfSpeech),
        enDef,
        example: normalize(d.example),
        partRaw: m.partOfSpeech,
      });
    }
  }
  if (candidates.length === 0) return null;

  const lemmaClean = lemma.replace(/\.\.\./g, "").toLowerCase();
  const preferredBucket = (() => {
    const b = inferPosFromLemma(lemma);
    if (b === "adv.") return "adv.";
    if (b === "v.") return "v.";
    if (b === "adj.") return "adj.";
    return "n.";
  })();

  const score = (c) => {
    let s = 0;
    const defLow = c.enDef.toLowerCase();
    if (defLow.includes(lemmaClean)) s += 5;
    if (lemmaClean.length > 2 && lemma.split(/\s+/).some((w) => w.length > 2 && defLow.includes(w.toLowerCase()))) s += 3;
    if (c.pos === preferredBucket) s += 2;
    if (c.example) s += 1;
    return s;
  };

  candidates.sort((a, b) => score(b) - score(a));
  const best = candidates[0];
  const pos = best.pos || inferPosFromLemma(lemma);
  const enExampleSat = best.example || fallbackSatExample(lemma, pos);
  return { pos, enDef: best.enDef, enExampleSat };
}

async function lookupDictionary(lemma) {
  if (offlineOnly) return null;
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lemma)}`;
  const data = await fetchJsonWithRetry(url, 3);
  if (!Array.isArray(data) || data.length === 0) return null;
  return pickBestDefinition(lemma, data[0]);
}

await acquireLock();
try {
if (retranslateOnly) {
  const raw = await fs.readFile(inputPath, "utf8");
  const words = JSON.parse(raw);
  const targets = [];
  for (const word of words) {
    const lemma = normalizeLemma(word.lemma);
    if (!lemma) continue;
    const needCn = Boolean(normalize(word.enDef)) && isGenericCnDef(lemma, word.cnDef);
    const needZhSat =
      Boolean(normalize(word.enExampleSat)) &&
      (isGenericEnSat(word.enExampleSat) || isGenericZhSat(word.zhExampleSat));
    if (needCn || needZhSat) targets.push({ word, lemma, needCn, needZhSat });
  }
  console.log(`Retranslate-only: ${targets.length} words need translation boost`);
  let updated = 0;
  let done = 0;
  for (let i = 0; i < targets.length; i += concurrency) {
    const chunk = targets.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async ({ word, needCn, needZhSat }) => {
        if (needCn) {
          const zh = await translateToZh(word.enDef);
          if (zh) word.cnDef = zh;
        }
        if (needZhSat) {
          const zs = await translateToZh(word.enExampleSat);
          if (zs) word.zhExampleSat = zs;
        }
        updated += 1;
      }),
    );
    done += chunk.length;
    console.error(`… retranslate progress ${done}/${targets.length}`);
    if (done % saveEvery === 0 && !dryRun) {
      await fs.writeFile(outputPath, JSON.stringify(words, null, 2), "utf8");
      console.log(`… retranslate checkpoint ${done}/${targets.length}`);
    }
    if (i + concurrency < targets.length) await sleep(40);
  }
  if (!dryRun) await fs.writeFile(outputPath, JSON.stringify(words, null, 2), "utf8");
  console.log(`Retranslate-only finished: ${updated} words touched`);
} else {
const raw = await fs.readFile(inputPath, "utf8");
const words = JSON.parse(raw);

let cache = {};
try {
  cache = JSON.parse(await fs.readFile(cachePath, "utf8"));
} catch {
  cache = {};
}

await fs.mkdir(path.dirname(cachePath), { recursive: true });

let processed = 0;
let filled = 0;
let fromCache = 0;
let failed = 0;
let skipped = 0;

function needsRefinement(word, lemma) {
  if (!normalize(word.enDef) || !normalize(word.cnDef) || !normalize(word.enExampleSat)) return true;
  if (refinePlaceholders && (isPlaceholder(word.cnDef) || isPlaceholder(word.enDef) || isPlaceholder(word.enExampleSat)))
    return true;
  if (refineTemplates && (isGenericCnDef(lemma, word.cnDef) || isGenericEnSat(word.enExampleSat))) return true;
  return false;
}

async function persistCache() {
  await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), "utf8");
}

async function persistOutput() {
  if (!dryRun) await fs.writeFile(outputPath, JSON.stringify(words, null, 2), "utf8");
}

const queue = [];
for (const word of words) {
  const lemma = normalizeLemma(word.lemma);
  if (!lemma) continue;
  if (!needsRefinement(word, lemma)) {
    skipped += 1;
    continue;
  }
  queue.push({ word, lemma, beforeEnSat: word.enExampleSat });
}

const capped = queue.length > limit ? queue.slice(0, limit) : queue;

console.log(`Queue to refine: ${capped.length} (concurrency=${concurrency})`);

async function refineOne({ word, lemma, beforeEnSat }) {
  let data = null;
  const cached = cache[lemma];
  if (cached != null && !forceRefetch) {
    data = cached;
    fromCache += 1;
  } else {
    data = await lookupDictionary(lemma);
    if (data) {
      const [cnDef, zhExampleSat] = skipTranslation
        ? ["", ""]
        : await Promise.all([translateToZh(data.enDef), translateToZh(data.enExampleSat)]);
      data = {
        pos: data.pos || "",
        enDef: data.enDef || "",
        cnDef: cnDef || "",
        enExampleSat: data.enExampleSat || "",
        zhExampleSat: zhExampleSat || "",
      };
      cache[lemma] = data;
      await sleep(sleepMs);
    } else {
      cache[lemma] = null;
      failed += 1;
    }
  }

  const chosenPos = data?.pos || inferPosFromLemma(lemma);
  const chosenEnDef = data?.enDef || fallbackEnDef(lemma, chosenPos);
  const chosenCnDef = data?.cnDef || fallbackZhDef(lemma, chosenPos);
  const chosenEnSat = data?.enExampleSat || fallbackSatExample(lemma, chosenPos);
  const chosenZhSat = data?.zhExampleSat || fallbackZhExampleSat(lemma, chosenPos);

  if (!normalize(word.pos) || (refinePlaceholders && isPlaceholder(word.pos))) word.pos = chosenPos;
  if (!normalize(word.enDef) || (refinePlaceholders && isPlaceholder(word.enDef))) word.enDef = chosenEnDef;
  if (!normalize(word.cnDef) || (refinePlaceholders && isPlaceholder(word.cnDef)) || (refineTemplates && isGenericCnDef(lemma, word.cnDef)))
    word.cnDef = chosenCnDef;
  if (!normalize(word.enExampleSat) || (refinePlaceholders && isPlaceholder(word.enExampleSat)) || (refineTemplates && isGenericEnSat(beforeEnSat)))
    word.enExampleSat = chosenEnSat;
  if (
    !normalize(word.zhExampleSat) ||
    (refinePlaceholders && isPlaceholder(word.zhExampleSat)) ||
    (refineTemplates && isGenericEnSat(beforeEnSat))
  )
    word.zhExampleSat = chosenZhSat;
}

let lastCheckpoint = 0;

for (let i = 0; i < capped.length; i += concurrency) {
  const chunk = capped.slice(i, i + concurrency);
  await Promise.all(chunk.map((item) => refineOne(item)));
  processed += chunk.length;
  filled += chunk.length;
  await persistCache();
  while (!dryRun && filled >= lastCheckpoint + saveEvery) {
    lastCheckpoint += saveEvery;
    await persistOutput();
    console.log(`… checkpoint ${lastCheckpoint} rows written`);
  }
  if (i + concurrency < capped.length) await sleep(30);
}

if (!dryRun) {
  await persistOutput();
}

console.log(`Input: ${inputPath}`);
console.log(`Output: ${outputPath}`);
console.log(`Skipped (already OK): ${skipped}`);
console.log(`Processed (refined): ${processed}`);
console.log(`Rows updated: ${filled}`);
console.log(`Loaded from cache: ${fromCache}`);
console.log(`Failed dictionary lookup: ${failed}`);
console.log(`Cache: ${cachePath}`);
}
} finally {
  await releaseLock();
}
