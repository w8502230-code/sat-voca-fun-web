import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const idx = args.findIndex((a) => a === name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
};

const inputPath = path.resolve(argValue("--input", "data/words-list-base.json"));

const normalizePos = (pos) => String(pos || "").toLowerCase().replaceAll(".", "").trim();
const hashLemma = (lemma) => {
  let hash = 0;
  for (let i = 0; i < lemma.length; i += 1) hash = (hash * 31 + lemma.charCodeAt(i)) >>> 0;
  return hash;
};

const getPosBucket = (pos) => {
  const normalized = normalizePos(pos);
  if (normalized.startsWith("n")) return "noun";
  if (normalized.startsWith("adj")) return "adj";
  if (normalized.startsWith("v")) return "verb";
  if (normalized.startsWith("adv")) return "adv";
  return "other";
};

const hpTemplates = {
  noun: [
    (lemma) => ({
      en: `In Slytherin notes, "${lemma}" was marked as a key concept for today's passage.`,
      zh: `在斯莱特林笔记中，“${lemma}”被标为今天篇章的关键概念。`,
    }),
    (lemma) => ({
      en: `Snape asked the class to explain how "${lemma}" sharpens the author's claim.`,
      zh: `斯内普要求全班解释“${lemma}”如何强化作者论点。`,
    }),
  ],
  adj: [
    (lemma) => ({
      en: `In the Slytherin discussion, the argument was described as "${lemma}" and evidence was demanded.`,
      zh: `在斯莱特林讨论中，这个论证被描述为“${lemma}”，并被要求给出证据。`,
    }),
    (lemma) => ({
      en: `Snape noted that a "${lemma}" tone can change how readers judge the same facts.`,
      zh: `斯内普指出，“${lemma}”的语气会改变读者对同一事实的判断。`,
    }),
  ],
  verb: [
    (lemma) => ({
      en: `In margin notes, students used "${lemma}" to name the action that drives the paragraph forward.`,
      zh: `在页边批注里，学生用“${lemma}”来标记推动段落前进的动作。`,
    }),
    (lemma) => ({
      en: `During review, Snape focused on when the author chooses to "${lemma}" rather than merely describe.`,
      zh: `在复盘时，斯内普重点讲了作者何时选择“${lemma}”而不是仅做描述。`,
    }),
  ],
  adv: [
    (lemma) => ({
      en: `The Slytherin team tracked how "${lemma}" modifies the logic of each sentence.`,
      zh: `斯莱特林小组追踪了“${lemma}”如何修饰每句的逻辑。`,
    }),
    (lemma) => ({
      en: `Snape highlighted "${lemma}" to show how adverbs steer a reader's interpretation.`,
      zh: `斯内普强调“${lemma}”，说明副词如何引导读者解读。`,
    }),
  ],
  other: [
    (lemma) => ({
      en: `In the Slytherin archive, "${lemma}" was tagged for deeper rhetorical analysis.`,
      zh: `在斯莱特林档案中，“${lemma}”被标记为需深入修辞分析。`,
    }),
    (lemma) => ({
      en: `The study journal flagged "${lemma}" as a clue to the author's strategy.`,
      zh: `学习日志把“${lemma}”标记为作者策略的线索。`,
    }),
  ],
};

const r99Templates = {
  noun: [
    (lemma) => ({
      en: `In Foundation records, "${lemma}" was logged as a key signal in the text.`,
      zh: `在基金会记录中，“${lemma}”被记为文本中的关键信号。`,
    }),
    (lemma) => ({
      en: `The Timekeeper marked "${lemma}" when mapping the argument's turning point.`,
      zh: `司辰在标注论证转折点时记下了“${lemma}”。`,
    }),
  ],
  adj: [
    (lemma) => ({
      en: `In the briefing, the team labeled the claim "${lemma}" before comparing evidence chains.`,
      zh: `在简报中，团队先把该论点标为“${lemma}”，再对比证据链。`,
    }),
    (lemma) => ({
      en: `Foundation analysts warned that a "${lemma}" tone can distort timeline judgments.`,
      zh: `基金会分析员提醒，“${lemma}”语气可能扭曲时间线判断。`,
    }),
  ],
  verb: [
    (lemma) => ({
      en: `In anomaly logs, "${lemma}" names the action that changes the mission outcome.`,
      zh: `在异常日志中，“${lemma}”指代会改变任务结果的动作。`,
    }),
    (lemma) => ({
      en: `Vertin discussed when to "${lemma}" so the evidence sequence remains coherent.`,
      zh: `维尔汀讨论了何时“${lemma}”才能保持证据序列连贯。`,
    }),
  ],
  adv: [
    (lemma) => ({
      en: `The Foundation report shows how "${lemma}" alters the force of each conclusion.`,
      zh: `基金会报告展示了“${lemma}”如何改变每个结论的力度。`,
    }),
    (lemma) => ({
      en: `The Timekeeper underlined "${lemma}" to track shifts in narrative stance.`,
      zh: `司辰给“${lemma}”做了下划线，以追踪叙述立场变化。`,
    }),
  ],
  other: [
    (lemma) => ({
      en: `In Foundation archives, "${lemma}" appeared as a recurring marker in anomaly notes.`,
      zh: `在基金会档案中，“${lemma}”作为异常笔记中的重复标记出现。`,
    }),
    (lemma) => ({
      en: `The notebook tagged "${lemma}" as a clue for the next reconstruction cycle.`,
      zh: `笔记把“${lemma}”标记为下一轮重构周期的线索。`,
    }),
  ],
};

const pickTemplate = (lemma, pos, theme) => {
  const bucket = getPosBucket(pos);
  const templates = theme === "hp_slytherin" ? hpTemplates[bucket] : r99Templates[bucket];
  const idx = hashLemma(String(lemma || "")) % templates.length;
  return templates[idx](lemma);
};

const OLD_HP_PATTERNS = [
  /^In the Slytherin archives, the term ".*" appeared in a note on strategic planning\.$/,
  /^Professor Snape highlighted ".*" while explaining advanced reading passages\.$/,
];
const OLD_R99_PATTERNS = [
  /^The Timekeeper recorded ".*" before the rain anomaly intensified\.$/,
  /^In the Foundation report, ".*" was tagged as a key timeline signal\.$/,
];

const matchesAny = (text, patterns) => patterns.some((re) => re.test(String(text || "").trim()));

const raw = await fs.readFile(inputPath, "utf8");
const words = JSON.parse(raw);
let updated = 0;

const nextWords = words.map((word) => {
  const hp = pickTemplate(word.lemma, word.pos, "hp_slytherin");
  const r99 = pickTemplate(word.lemma, word.pos, "reverse_1999");

  let touched = false;
  const themedExamples = { ...(word.themedExamples || {}) };
  const themedExamplesZh = { ...(word.themedExamplesZh || {}) };

  if (matchesAny(themedExamples.hp_slytherin, OLD_HP_PATTERNS)) {
    themedExamples.hp_slytherin = hp.en;
    themedExamplesZh.hp_slytherin = hp.zh;
    touched = true;
  }
  if (matchesAny(themedExamples.reverse_1999, OLD_R99_PATTERNS)) {
    themedExamples.reverse_1999 = r99.en;
    themedExamplesZh.reverse_1999 = r99.zh;
    touched = true;
  }

  let enExampleTheme = word.enExampleTheme;
  let zhExampleTheme = word.zhExampleTheme;
  if (matchesAny(enExampleTheme, OLD_HP_PATTERNS)) {
    enExampleTheme = hp.en;
    zhExampleTheme = hp.zh;
    touched = true;
  } else if (matchesAny(enExampleTheme, OLD_R99_PATTERNS)) {
    enExampleTheme = r99.en;
    zhExampleTheme = r99.zh;
    touched = true;
  }

  if (touched) updated += 1;
  return touched
    ? { ...word, enExampleTheme, zhExampleTheme, themedExamples, themedExamplesZh }
    : word;
});

await fs.writeFile(inputPath, `${JSON.stringify(nextWords, null, 2)}\n`, "utf8");
console.log(`Updated theme sentences for ${updated} words.`);
