import fs from "node:fs/promises";
import path from "node:path";

const importsPath = path.resolve("data/imports/words-list-all.json");
const existingPath = path.resolve("data/words-list1.json");
const outputPath = path.resolve("data/words-list-base.json");

const normalizeLemma = (v) => String(v ?? "").trim().toLowerCase();

const emptyTemplate = (lemma) => ({
  lemma,
  pos: "",
  cnDef: "",
  enDef: "",
  enExampleSat: "",
  zhExampleSat: "",
  enExampleTheme: "",
  zhExampleTheme: "",
});

const imported = JSON.parse(await fs.readFile(importsPath, "utf8"));
const existing = JSON.parse(await fs.readFile(existingPath, "utf8"));

const existingByLemma = new Map(existing.map((row) => [normalizeLemma(row.lemma), row]));
const merged = imported.map((row) => {
  const lemma = normalizeLemma(row.lemma);
  const known = existingByLemma.get(lemma);
  return known
    ? {
        lemma,
        pos: String(known.pos ?? "").trim(),
        cnDef: String(known.cnDef ?? "").trim(),
        enDef: String(known.enDef ?? "").trim(),
        enExampleSat: String(known.enExampleSat ?? known.enExample ?? "").trim(),
        zhExampleSat: String(known.zhExampleSat ?? known.zhExample ?? "").trim(),
        enExampleTheme: String(known.enExampleTheme ?? "").trim(),
        zhExampleTheme: String(known.zhExampleTheme ?? "").trim(),
      }
    : emptyTemplate(lemma);
});

await fs.writeFile(outputPath, JSON.stringify(merged, null, 2), "utf8");

const prefilled = merged.filter((row) => row.cnDef && row.enDef && row.enExampleSat).length;
console.log(`Merged base words: ${merged.length}`);
console.log(`Prefilled from existing dataset: ${prefilled}`);
console.log(`Needs enrichment: ${merged.length - prefilled}`);
console.log(`Output: ${outputPath}`);
