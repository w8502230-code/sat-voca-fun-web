/**
 * Scan words-list-base.json for broken SAT example templates (e.g. "Students often <lemma> key ideas...")
 * and replace enExampleSat / zhExampleSat with POS-aware safe sentences.
 *
 * Usage:
 *   node scripts/scan-and-fix-bad-sat-examples.mjs
 *   node scripts/scan-and-fix-bad-sat-examples.mjs --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const basePath = path.join(root, "data", "words-list-base.json");
const reportPath = path.join(root, "data", "imports", "bad-sat-examples-scan-report.txt");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const reStudentsOften =
  /^Students often ([^ ]+) key ideas while reviewing SAT passages\.$/;
const reArgumentPresented =
  /^The argument was presented ([^,]+), which improved clarity for readers\.$/;

/** Normalize pos like "n." "adj." */
function posBucket(pos) {
  const p = String(pos ?? "")
    .toLowerCase()
    .replaceAll(".", "")
    .trim();
  if (p.startsWith("adj")) return "adj";
  if (p.startsWith("adv")) return "adv";
  if (p.startsWith("n")) return "n";
  if (p.startsWith("v")) return "v";
  return "other";
}

function buildSatPair(lemma, pos) {
  const bucket = posBucket(pos);
  let en;
  let zh;

  if (bucket === "adj") {
    en = `The narrator becomes ${lemma} once the evidence shifts in a way the opening paragraph did not anticipate.`;
    zh = `当证据出现开头段落未曾预料到的变化时，叙述者的态度变得${lemma}。`;
  } else if (bucket === "adv") {
    en = `The author advances the claim ${lemma}, tightening each step before the conclusion.`;
    zh = `作者${lemma}地推进论点，在得出结论前逐步收紧每一步。`;
  } else if (bucket === "n") {
    en = `The ${lemma} in the final sentence compresses the argument into a single, decisive claim.`;
    zh = `文末一段中的${lemma}把论证压缩成一句话。`;
  } else if (bucket === "v") {
    en = `Careful readers examine how "${lemma}" functions when the author moves from evidence to interpretation.`;
    zh = `细心的读者会审视“${lemma}”在作者从证据过渡到阐释时起到的作用。`;
  } else {
    en = `The passage uses "${lemma}" in a way that ties concrete evidence to the author's central claim.`;
    zh = `这段文字在将具体证据与作者核心论点联系起来时，用到了“${lemma}”。`;
  }

  return { en, zh };
}

function main() {
  const raw = fs.readFileSync(basePath, "utf8");
  /** @type {Array<Record<string, unknown>>} */
  const words = JSON.parse(raw);

  const reOldAdjTone =
    /^The tone becomes ([^ ]+) as the narrator responds to the sudden shift in the evidence\.$/;

  const stats = {
    total: words.length,
    fixedStudentsOften: 0,
    fixedArgumentPresented: 0,
    fixedOldAdjToneTemplate: 0,
    skippedLemmaMismatch: 0,
  };
  const details = [];

  for (const w of words) {
    const lemma = typeof w.lemma === "string" ? w.lemma : "";
    const pos = typeof w.pos === "string" ? w.pos : "";
    const sat = typeof w.enExampleSat === "string" ? w.enExampleSat : "";
    if (!lemma || !sat) continue;

    let m = sat.match(reStudentsOften);
    let kind = null;
    if (m) {
      kind = "Students often … key ideas";
      const extracted = m[1];
      if (extracted.toLowerCase() !== lemma.toLowerCase()) {
        stats.skippedLemmaMismatch += 1;
        details.push(`${lemma}\t${kind}\textracted "${extracted}" !== lemma — skipped`);
        continue;
      }
    } else {
      m = sat.match(reArgumentPresented);
      if (m) {
        kind = "The argument was presented …";
        const extracted = m[1].trim();
        if (extracted.toLowerCase() !== lemma.toLowerCase()) {
          stats.skippedLemmaMismatch += 1;
          details.push(`${lemma}\t${kind}\textracted "${extracted}" !== lemma — skipped`);
          continue;
        }
      }
    }

    if (!kind) continue;

    const { en, zh } = buildSatPair(lemma, pos);
    if (!dryRun) {
      w.enExampleSat = en;
      w.zhExampleSat = zh;
    }
    if (kind.startsWith("Students")) stats.fixedStudentsOften += 1;
    else stats.fixedArgumentPresented += 1;
    details.push(`${lemma}\t${kind}\treplaced`);
  }

  for (const w of words) {
    const lemma = typeof w.lemma === "string" ? w.lemma : "";
    const pos = typeof w.pos === "string" ? w.pos : "";
    const sat = typeof w.enExampleSat === "string" ? w.enExampleSat : "";
    if (!lemma || !sat) continue;
    const m = sat.match(reOldAdjTone);
    if (!m) continue;
    if (m[1].toLowerCase() !== lemma.toLowerCase()) continue;
    const { en, zh } = buildSatPair(lemma, pos);
    if (!dryRun) {
      w.enExampleSat = en;
      w.zhExampleSat = zh;
    }
    stats.fixedOldAdjToneTemplate += 1;
    details.push(`${lemma}\told adj tone template\treplaced`);
  }

  const summary = [
    `dryRun: ${dryRun}`,
    `total words: ${stats.total}`,
    `fixed (Students often … key ideas): ${stats.fixedStudentsOften}`,
    `fixed (The argument was presented …): ${stats.fixedArgumentPresented}`,
    `fixed (old “The tone becomes …” adj draft): ${stats.fixedOldAdjToneTemplate}`,
    `skipped (extracted token !== lemma): ${stats.skippedLemmaMismatch}`,
  ].join("\n");

  const report = `${summary}\n\n--- detail ---\n${details.sort().join("\n")}\n`;
  fs.writeFileSync(reportPath, report, "utf8");

  if (!dryRun) {
    fs.writeFileSync(basePath, `${JSON.stringify(words, null, 2)}\n`, "utf8");
  }

  console.log(summary);
  console.log(`Wrote report: ${reportPath}`);
  if (!dryRun) console.log(`Updated: ${basePath}`);
}

main();
