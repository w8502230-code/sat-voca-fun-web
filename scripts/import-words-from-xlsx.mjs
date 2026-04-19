import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import xlsx from "xlsx";

const sourceArg = process.argv[2];

if (!sourceArg) {
  console.error("Usage: node scripts/import-words-from-xlsx.mjs <xlsx-path>");
  process.exit(1);
}

const sourcePath = path.resolve(sourceArg);
const outputPath = path.resolve("data/words-list1.json");

const workbook = xlsx.readFile(sourcePath, { cellDates: false });
const firstSheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[firstSheetName];

const rows = xlsx.utils.sheet_to_json(sheet, {
  defval: "",
  raw: false,
});

const words = rows
  .map((row) => ({
    lemma: String(row.lemma || "").trim().toLowerCase(),
    pos: String(row.pos || "").trim(),
    cnDef: String(row.cn_def || "").trim(),
    enDef: String(row.en_def || "").trim(),
    enExample: String(row.en_example || "").trim(),
    zhExample: String(row.zh_example || "").trim(),
  }))
  .filter((row) => row.lemma.length > 0);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(words, null, 2), "utf8");

console.log(`Imported ${words.length} words to ${outputPath}`);
