import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const idx = args.findIndex((a) => a === name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
};

const wordFilePath = path.resolve(argValue("--input", "data/words-list1.json"));

const normalizePos = (pos) => String(pos || "").toLowerCase().replaceAll(".", "").trim();

const hashLemma = (lemma) => {
  let hash = 0;
  for (let i = 0; i < lemma.length; i += 1) {
    hash = (hash * 31 + lemma.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const getPosBucket = (pos) => {
  const normalized = normalizePos(pos);
  if (normalized.startsWith("n")) return "noun";
  if (normalized.startsWith("adj")) return "adj";
  if (normalized.startsWith("v")) return "verb";
  return "other";
};

const hpTemplates = {
  noun: [
    (lemma) => ({
      en: `In the Slytherin archives, the term "${lemma}" appeared in a note on strategic planning.`,
      zh: `在斯莱特林档案中，术语“${lemma}”出现在一份关于策略规划的笔记里。`,
    }),
    (lemma) => ({
      en: `Professor Snape highlighted "${lemma}" while explaining advanced reading passages.`,
      zh: `斯内普教授在讲解高阶阅读材料时特别强调了“${lemma}”。`,
    }),
  ],
  adj: [
    (lemma) => ({
      en: `During the house briefing, Draco gave a ${lemma} response that shifted the team's plan.`,
      zh: `在学院简报中，德拉科给出了一个${lemma}的回应，改变了团队计划。`,
    }),
    (lemma) => ({
      en: `The prefect praised her ${lemma} judgment in the potion challenge.`,
      zh: `级长称赞了她在魔药挑战中的${lemma}判断。`,
    }),
  ],
  verb: [
    (lemma) => ({
      en: `To pass the midnight task, students had to ${lemma} the clues hidden in the dungeon.`,
      zh: `为了通过午夜任务，学生们必须${lemma}地处理藏在地牢里的线索。`,
    }),
    (lemma) => ({
      en: `The Slytherin team learned to ${lemma} quickly before the final duel.`,
      zh: `斯莱特林队在最终对决前学会了迅速${lemma}。`,
    }),
  ],
  other: [
    (lemma) => ({
      en: `In the Slytherin chamber, "${lemma}" came up in a strategy discussion.`,
      zh: `在斯莱特林密室中，“${lemma}”出现在一次策略讨论里。`,
    }),
    (lemma) => ({
      en: `The study journal used "${lemma}" to summarize today's mission outcome.`,
      zh: `学习日志用“${lemma}”来总结今天任务结果。`,
    }),
  ],
};

const r99Templates = {
  noun: [
    (lemma) => ({
      en: `In the Foundation report, "${lemma}" was tagged as a key timeline signal.`,
      zh: `在基金会报告中，“${lemma}”被标记为关键时间线信号。`,
    }),
    (lemma) => ({
      en: `The Timekeeper recorded "${lemma}" before the rain anomaly intensified.`,
      zh: `在雨灾异常加剧前，司辰记录下了“${lemma}”。`,
    }),
  ],
  adj: [
    (lemma) => ({
      en: `Her ${lemma} analysis helped the Foundation stabilize the fractured district.`,
      zh: `她${lemma}的分析帮助基金会稳定了破碎街区。`,
    }),
    (lemma) => ({
      en: `The team needed a ${lemma} decision before the next temporal collapse.`,
      zh: `在下一次时序崩塌前，团队需要一个${lemma}的决策。`,
    }),
  ],
  verb: [
    (lemma) => ({
      en: `To secure the mission, Vertin had to ${lemma} every clue in chronological order.`,
      zh: `为确保任务成功，维尔汀必须按时间顺序${lemma}每条线索。`,
    }),
    (lemma) => ({
      en: `Foundation analysts ${lemma} the records again after the storm rewound the hour.`,
      zh: `在风暴把时间回卷后，基金会分析员再次${lemma}了档案。`,
    }),
  ],
  other: [
    (lemma) => ({
      en: `In the Foundation archive, "${lemma}" appeared in a time-anomaly report.`,
      zh: `在基金会档案中，“${lemma}”出现在一份时间异常报告里。`,
    }),
    (lemma) => ({
      en: `The notebook marked "${lemma}" as a clue for the next reconstruction cycle.`,
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

const raw = await fs.readFile(wordFilePath, "utf8");
const words = JSON.parse(raw);
const normalize = (v) => String(v ?? "").trim();

const enriched = words.map((word) => {
  const hp = pickTemplate(word.lemma, word.pos, "hp_slytherin");
  const r99 = pickTemplate(word.lemma, word.pos, "reverse_1999");

  return {
    ...word,
    enExampleSat: normalize(word.enExampleSat) || normalize(word.enExample) || "",
    zhExampleSat: normalize(word.zhExampleSat) || normalize(word.zhExample) || "",
    enExampleTheme: normalize(word.enExampleTheme) || hp.en,
    zhExampleTheme: normalize(word.zhExampleTheme) || hp.zh,
    themedExamples: word.themedExamples && Object.keys(word.themedExamples).length > 0 ? word.themedExamples : {
      hp_slytherin: hp.en,
      reverse_1999: r99.en,
    },
    themedExamplesZh:
      word.themedExamplesZh && Object.keys(word.themedExamplesZh).length > 0
        ? word.themedExamplesZh
        : {
      hp_slytherin: hp.zh,
      reverse_1999: r99.zh,
    },
  };
});

await fs.writeFile(wordFilePath, `${JSON.stringify(enriched, null, 2)}\n`, "utf8");
console.log(`Enriched theme examples for ${enriched.length} words.`);
