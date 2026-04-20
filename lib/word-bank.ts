import wordList from "@/data/words-list-base.json";
import type { ThemeId } from "@/lib/theme";

export type WordEntry = {
  lemma: string;
  pos: string;
  cnDef: string;
  enDef: string;
  enExampleSat: string;
  zhExampleSat?: string;
  enExampleTheme?: string;
  zhExampleTheme?: string;
};

type ThemeExampleFallback = {
  en: string;
  zh: string;
};

type RawWordEntry = {
  lemma: string;
  pos: string;
  cnDef: string;
  enDef: string;
  enExample?: string;
  zhExample?: string;
  enExampleSat?: string;
  enExampleTheme?: string;
  zhExampleTheme?: string;
  themedExamples?: Partial<Record<ThemeId, string>>;
};

const allWords = (wordList as RawWordEntry[]).map((raw) => {
  const enExampleSat = raw.enExampleSat ?? raw.enExample ?? "";
  const themeSpecific = raw.themedExamples?.hp_slytherin ?? raw.themedExamples?.reverse_1999;
  const enExampleTheme = raw.enExampleTheme ?? themeSpecific;

  return {
    lemma: raw.lemma,
    pos: raw.pos,
    cnDef: raw.cnDef,
    enDef: raw.enDef,
    enExampleSat,
    zhExampleSat: raw.zhExample,
    enExampleTheme,
    zhExampleTheme: raw.zhExampleTheme,
  } satisfies WordEntry;
});
const DAILY_TARGET = 50;

export const getAllWords = (): WordEntry[] => allWords;

const normalizePos = (pos: string) => pos.toLowerCase().replaceAll(".", "").trim();

const hashLemma = (lemma: string) => {
  let hash = 0;
  for (let i = 0; i < lemma.length; i += 1) {
    hash = (hash * 31 + lemma.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const hpTemplates = {
  noun: [
    (lemma: string): ThemeExampleFallback => ({
      en: `In the Slytherin archives, the term "${lemma}" appeared in a note on strategic planning.`,
      zh: `在斯莱特林档案中，术语“${lemma}”出现在一份关于策略规划的笔记里。`,
    }),
    (lemma: string): ThemeExampleFallback => ({
      en: `Professor Snape highlighted "${lemma}" while explaining advanced reading passages.`,
      zh: `斯内普教授在讲解高阶阅读材料时特别强调了“${lemma}”。`,
    }),
  ],
  adj: [
    (lemma: string): ThemeExampleFallback => ({
      en: `During the house briefing, Draco gave a ${lemma} response that shifted the team's plan.`,
      zh: `在学院简报中，德拉科给出了一个${lemma}的回应，改变了团队计划。`,
    }),
    (lemma: string): ThemeExampleFallback => ({
      en: `The prefect praised her ${lemma} judgment in the potion challenge.`,
      zh: `级长称赞了她在魔药挑战中的${lemma}判断。`,
    }),
  ],
  verb: [
    (lemma: string): ThemeExampleFallback => ({
      en: `To pass the midnight task, students had to ${lemma} the clues hidden in the dungeon.`,
      zh: `为了通过午夜任务，学生们必须${lemma}地处理藏在地牢里的线索。`,
    }),
    (lemma: string): ThemeExampleFallback => ({
      en: `The Slytherin team learned to ${lemma} quickly before the final duel.`,
      zh: `斯莱特林队在最终对决前学会了迅速${lemma}。`,
    }),
  ],
  other: [
    (lemma: string): ThemeExampleFallback => ({
      en: `In the Slytherin chamber, "${lemma}" came up in a strategy discussion.`,
      zh: `在斯莱特林密室中，“${lemma}”出现在一次策略讨论里。`,
    }),
    (lemma: string): ThemeExampleFallback => ({
      en: `The study journal used "${lemma}" to summarize today's mission outcome.`,
      zh: `学习日志用“${lemma}”来总结今天任务结果。`,
    }),
  ],
};

const r99Templates = {
  noun: [
    (lemma: string): ThemeExampleFallback => ({
      en: `In the Foundation report, "${lemma}" was tagged as a key timeline signal.`,
      zh: `在基金会报告中，“${lemma}”被标记为关键时间线信号。`,
    }),
    (lemma: string): ThemeExampleFallback => ({
      en: `The Timekeeper recorded "${lemma}" before the rain anomaly intensified.`,
      zh: `在雨灾异常加剧前，司辰记录下了“${lemma}”。`,
    }),
  ],
  adj: [
    (lemma: string): ThemeExampleFallback => ({
      en: `Her ${lemma} analysis helped the Foundation stabilize the fractured district.`,
      zh: `她${lemma}的分析帮助基金会稳定了破碎街区。`,
    }),
    (lemma: string): ThemeExampleFallback => ({
      en: `The team needed a ${lemma} decision before the next temporal collapse.`,
      zh: `在下一次时序崩塌前，团队需要一个${lemma}的决策。`,
    }),
  ],
  verb: [
    (lemma: string): ThemeExampleFallback => ({
      en: `To secure the mission, Vertin had to ${lemma} every clue in chronological order.`,
      zh: `为确保任务成功，维尔汀必须按时间顺序${lemma}每条线索。`,
    }),
    (lemma: string): ThemeExampleFallback => ({
      en: `Foundation analysts ${lemma} the records again after the storm rewound the hour.`,
      zh: `在风暴把时间回卷后，基金会分析员再次${lemma}了档案。`,
    }),
  ],
  other: [
    (lemma: string): ThemeExampleFallback => ({
      en: `In the Foundation archive, "${lemma}" appeared in a time-anomaly report.`,
      zh: `在基金会档案中，“${lemma}”出现在一份时间异常报告里。`,
    }),
    (lemma: string): ThemeExampleFallback => ({
      en: `The notebook marked "${lemma}" as a clue for the next reconstruction cycle.`,
      zh: `笔记把“${lemma}”标记为下一轮重构周期的线索。`,
    }),
  ],
};

const getPosBucket = (pos: string): "noun" | "adj" | "verb" | "other" => {
  const normalized = normalizePos(pos);
  if (normalized.startsWith("n")) return "noun";
  if (normalized.startsWith("adj")) return "adj";
  if (normalized.startsWith("v")) return "verb";
  return "other";
};

export const getThemeExampleFallback = (word: WordEntry, theme: ThemeId): ThemeExampleFallback => {
  const bucket = getPosBucket(word.pos);
  const templates = theme === "hp_slytherin" ? hpTemplates[bucket] : r99Templates[bucket];
  const idx = hashLemma(word.lemma) % templates.length;
  return templates[idx](word.lemma);
};

const getDaySeed = (input: Date) =>
  Math.floor(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()) / 86_400_000);

export const getWordBankCount = () => allWords.length;

export const getDailyWords = (date: Date, targetCount = DAILY_TARGET): WordEntry[] => {
  if (allWords.length === 0) return [];
  const seed = getDaySeed(date);
  const start = (seed * targetCount) % allWords.length;
  const words: WordEntry[] = [];

  for (let i = 0; i < targetCount; i += 1) {
    words.push(allWords[(start + i) % allWords.length]);
  }

  return words;
};

export const getStudyBatches = (date: Date, batchSize = 10, targetCount = DAILY_TARGET) => {
  const words = getDailyWords(date, targetCount);
  const batches: WordEntry[][] = [];

  for (let i = 0; i < words.length; i += batchSize) {
    batches.push(words.slice(i, i + batchSize));
  }

  return batches;
};
