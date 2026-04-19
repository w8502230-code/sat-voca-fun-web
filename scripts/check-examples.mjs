import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const argValue = (name, fallback) => {
  const idx = args.findIndex((a) => a === name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
};

if (hasFlag("--help")) {
  console.log(
    [
      "Usage: node scripts/check-examples.mjs [--input <file-or-dir>] [--pattern <name-prefix>] [--report <output-json>] [--strict-theme]",
      "",
      "Defaults:",
      "  --input data",
      "  --pattern words-list",
      "  --report data/example-quality-report.json",
      "",
      "Examples:",
      "  npm run check:examples",
      "  npm run check:examples -- --input data --pattern words-list",
      "  npm run check:examples -- --input ./imports --strict-theme",
    ].join("\n"),
  );
  process.exit(0);
}

const inputPath = path.resolve(argValue("--input", "data"));
const namePrefix = argValue("--pattern", "words-list");
const reportPath = path.resolve(argValue("--report", "data/example-quality-report.json"));
const strictTheme = hasFlag("--strict-theme");

const normalize = (v) => String(v ?? "").trim();
const normalizeLower = (v) => normalize(v).toLowerCase();

async function listCandidateFiles(fileOrDir) {
  const stat = await fs.stat(fileOrDir);
  if (stat.isFile()) return [fileOrDir];
  const entries = await fs.readdir(fileOrDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(fileOrDir, entry.name))
    .filter((file) => file.toLowerCase().endsWith(".json"))
    .filter((file) => path.basename(file).startsWith(namePrefix));
}

function parseWords(raw, filePath) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      words: [],
      fileError: `Invalid JSON in ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (!Array.isArray(parsed)) {
    return { words: [], fileError: `Expected array root in ${filePath}` };
  }
  return { words: parsed, fileError: null };
}

const files = await listCandidateFiles(inputPath);
if (files.length === 0) {
  console.error(`No matching JSON files found under: ${inputPath}`);
  process.exit(1);
}

const summary = {
  scannedFiles: files.length,
  scannedWords: 0,
  missingLemma: 0,
  missingCnDef: 0,
  missingEnDef: 0,
  missingSat: 0,
  missingSatZh: 0,
  missingTheme: 0,
  missingThemeZh: 0,
  satThemeExactDuplicate: 0,
  satWithoutLemmaMention: 0,
  duplicateLemmaRows: 0,
  duplicateSatRows: 0,
};

const details = {
  fileErrors: [],
  duplicateLemmaRows: [],
  duplicateSatRows: [],
  samples: {
    missingSat: [],
    missingTheme: [],
    satWithoutLemmaMention: [],
  },
};

const lemmaSeen = new Set();
const satSeen = new Set();

for (const filePath of files) {
  const raw = await fs.readFile(filePath, "utf8");
  const { words, fileError } = parseWords(raw, filePath);
  if (fileError) {
    details.fileErrors.push(fileError);
    continue;
  }

  for (const row of words) {
    summary.scannedWords += 1;
    const lemma = normalize(row.lemma).toLowerCase();
    const cnDef = normalize(row.cnDef);
    const enDef = normalize(row.enDef);
    const sat = normalize(row.enExampleSat ?? row.enExample);
    const satZh = normalize(row.zhExampleSat ?? row.zhExample);
    const theme = normalize(row.enExampleTheme);
    const themeZh = normalize(row.zhExampleTheme);

    if (!lemma) summary.missingLemma += 1;
    if (!cnDef) summary.missingCnDef += 1;
    if (!enDef) summary.missingEnDef += 1;
    if (!sat) summary.missingSat += 1;
    if (!satZh) summary.missingSatZh += 1;
    if (!theme) summary.missingTheme += 1;
    if (!themeZh) summary.missingThemeZh += 1;
    if (sat && theme && normalizeLower(sat) === normalizeLower(theme)) summary.satThemeExactDuplicate += 1;

    if (lemma && sat && !normalizeLower(sat).includes(lemma)) summary.satWithoutLemmaMention += 1;

    if (lemma) {
      const lemmaKey = `${filePath}::${lemma}`;
      if (lemmaSeen.has(lemmaKey)) {
        summary.duplicateLemmaRows += 1;
        if (details.duplicateLemmaRows.length < 30) details.duplicateLemmaRows.push({ file: filePath, lemma });
      } else {
        lemmaSeen.add(lemmaKey);
      }
    }

    if (sat) {
      const satKey = normalizeLower(sat);
      if (satSeen.has(satKey)) {
        summary.duplicateSatRows += 1;
        if (details.duplicateSatRows.length < 30) details.duplicateSatRows.push({ file: filePath, lemma, sat });
      } else {
        satSeen.add(satKey);
      }
    }

    if (!sat && details.samples.missingSat.length < 20) details.samples.missingSat.push({ file: filePath, lemma });
    if (!theme && details.samples.missingTheme.length < 20) details.samples.missingTheme.push({ file: filePath, lemma });
    if (lemma && sat && !normalizeLower(sat).includes(lemma) && details.samples.satWithoutLemmaMention.length < 20) {
      details.samples.satWithoutLemmaMention.push({ file: filePath, lemma, sat });
    }
  }
}

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(
  reportPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      strictTheme,
      inputPath,
      namePrefix,
      summary,
      details,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(`Scanned files: ${summary.scannedFiles}`);
console.log(`Scanned words: ${summary.scannedWords}`);
console.log(`Missing lemma/cnDef/enDef: ${summary.missingLemma}/${summary.missingCnDef}/${summary.missingEnDef}`);
console.log(`Missing SAT sentence: ${summary.missingSat}`);
console.log(`Missing SAT zh sentence: ${summary.missingSatZh}`);
console.log(`Missing theme sentence: ${summary.missingTheme}`);
console.log(`Missing theme zh sentence: ${summary.missingThemeZh}`);
console.log(`SAT/theme exact duplicates: ${summary.satThemeExactDuplicate}`);
console.log(`SAT without lemma mention: ${summary.satWithoutLemmaMention}`);
console.log(`Duplicate lemma rows: ${summary.duplicateLemmaRows}`);
console.log(`Duplicate SAT rows: ${summary.duplicateSatRows}`);
console.log(`Report written: ${reportPath}`);

const failCount =
  summary.missingLemma +
  summary.missingCnDef +
  summary.missingEnDef +
  summary.missingSat +
  summary.duplicateLemmaRows;
const themeFailCount = strictTheme ? summary.missingTheme : 0;

if (details.fileErrors.length > 0 || failCount > 0 || themeFailCount > 0) {
  process.exitCode = 1;
}
