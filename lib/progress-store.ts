import {
  computeQuizPointsEarned,
  getCompletionBadge,
  getCompletionEggLine,
  type CompletionBadge,
} from "@/lib/incentive";
import {
  buildQuestionsForWords,
  gradeSessionSubmit,
  gradeStatelessAnswer,
  statelessCorrectOption,
  toPublicQuestion,
  type QuizAnswerInput,
  type QuizQuestionStored,
} from "@/lib/quiz-engine";
import { getThemeByDate } from "@/lib/theme";
import { getAllWords, getDailyWords } from "@/lib/word-bank";

type StudyStatus = "remembered" | "forgotten";
type QuizScope = "batch" | "daily" | "wrong";

type ReviewTask = {
  lemma: string;
  dueDate: string;
  intervalDays: 1 | 3 | 7;
  completedAt?: string;
};

type LearnerProgress = {
  wordStatus: Map<string, StudyStatus>;
  masteredLemmas: Set<string>;
  dayMarks: Map<string, Map<string, StudyStatus>>;
  dailyCompleted: Set<string>;
  reviewTasks: ReviewTask[];
  quizStatsByDay: Map<string, { correct: number; total: number }>;
  wrongLemmasByDay: Map<string, Set<string>>;
  quizCompletedScopesByDay: Map<string, Set<QuizScope>>;
  /** PRD 4.7 — theme-named points; first finish per scope per UTC day earns points */
  incentivePointsByDay?: Map<string, number>;
};

type StudyMarkInput = {
  householdCode: string;
  learnerId: string;
  lemma: string;
  status: StudyStatus;
  occurredAtIso: string;
};

type QuizSessionRecord = {
  sessionId: string;
  householdCode: string;
  learnerId: string;
  dayKey: string;
  scope: QuizScope;
  questions: QuizQuestionStored[];
  submitted: boolean;
  submittedResult?: {
    scope: QuizScope;
    correct: number;
    total: number;
    accuracy: number;
    results: Array<{
      questionId: string;
      lemma: string;
      selectedOption: string;
      correctOption: string;
      isCorrect: boolean;
    }>;
    wrongLemmaCount: number;
    pointsEarnedThisQuiz: number;
    totalPointsToday: number;
    badge: CompletionBadge | null;
    eggLine: string | null;
  };
};

/**
 * Next.js may load this module in more than one server bundle (RSC vs Route Handlers).
 * Plain module-level Maps would not be shared, so API writes and `/result` reads could diverge.
 * Hang the singletons off globalThis so all bundles share one in-memory store (dev/MVP).
 */
type ProgressGlobal = typeof globalThis & {
  __satVocaProgressStore?: Map<string, LearnerProgress>;
  __satVocaQuizSessions?: Map<string, QuizSessionRecord>;
};

const g = globalThis as ProgressGlobal;

const store =
  g.__satVocaProgressStore ?? (g.__satVocaProgressStore = new Map<string, LearnerProgress>());

const quizSessions =
  g.__satVocaQuizSessions ?? (g.__satVocaQuizSessions = new Map<string, QuizSessionRecord>());

const toDayKey = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (isoDay: string, days: number) => {
  const date = new Date(`${isoDay}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDayKey(date);
};

const ensureIncentivePoints = (progress: LearnerProgress) => {
  if (!progress.incentivePointsByDay) progress.incentivePointsByDay = new Map();
};

const getOrCreateProgress = (householdCode: string, learnerId: string): LearnerProgress => {
  const key = `${householdCode}::${learnerId}`;
  const existed = store.get(key);
  if (existed) {
    ensureIncentivePoints(existed);
    return existed;
  }

  const initial: LearnerProgress = {
    wordStatus: new Map(),
    masteredLemmas: new Set(),
    dayMarks: new Map(),
    dailyCompleted: new Set(),
    reviewTasks: [],
    quizStatsByDay: new Map(),
    wrongLemmasByDay: new Map(),
    quizCompletedScopesByDay: new Map(),
    incentivePointsByDay: new Map(),
  } satisfies LearnerProgress;
  store.set(key, initial);
  return initial;
};

const getOrCreateWrongSet = (progress: LearnerProgress, dayKey: string) => {
  const existed = progress.wrongLemmasByDay.get(dayKey);
  if (existed) return existed;
  const created = new Set<string>();
  progress.wrongLemmasByDay.set(dayKey, created);
  return created;
};

const hashString = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const rotatePick = <T,>(items: T[], count: number, seed: string) => {
  if (items.length <= count) return [...items];
  const start = hashString(seed) % items.length;
  const output: T[] = [];
  for (let i = 0; i < count; i += 1) {
    output.push(items[(start + i) % items.length]);
  }
  return output;
};

const deterministicShuffle = <T,>(items: T[], seedInput: string): T[] => {
  const output = [...items];
  let seed = hashString(seedInput) || 1;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRand() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
};

const ensureReviewTasksForDay = (progress: LearnerProgress, dayKey: string, lemmas: string[]) => {
  const uniqueLemmas = [...new Set(lemmas)];
  const intervals: Array<1 | 3 | 7> = [1, 3, 7];

  uniqueLemmas.forEach((lemma) => {
    intervals.forEach((intervalDays) => {
      const dueDate = addDays(dayKey, intervalDays);
      const exists = progress.reviewTasks.some(
        (task) => task.lemma === lemma && task.intervalDays === intervalDays && task.dueDate === dueDate,
      );
      if (!exists) progress.reviewTasks.push({ lemma, dueDate, intervalDays });
    });
  });
};

export const applyStudyMark = (input: StudyMarkInput) => {
  const progress = getOrCreateProgress(input.householdCode, input.learnerId);
  const normalizedLemma = input.lemma.toLowerCase();
  progress.wordStatus.set(normalizedLemma, input.status);

  if (input.status === "remembered") progress.masteredLemmas.add(normalizedLemma);

  const occurredAt = new Date(input.occurredAtIso);
  const dayKey = toDayKey(occurredAt);
  const dayMap = progress.dayMarks.get(dayKey) ?? new Map<string, StudyStatus>();
  dayMap.set(normalizedLemma, input.status);
  progress.dayMarks.set(dayKey, dayMap);
  if (input.status === "forgotten") {
    getOrCreateWrongSet(progress, dayKey).add(normalizedLemma);
  }

  const dailyWords = getDailyWords(occurredAt);
  const expectedLemmas = new Set(dailyWords.map((word) => word.lemma.toLowerCase()));
  const markedToday = [...dayMap.keys()].filter((lemma) => expectedLemmas.has(lemma));
  const isDailyCompleted = markedToday.length >= dailyWords.length;

  if (isDailyCompleted && !progress.dailyCompleted.has(dayKey)) {
    progress.dailyCompleted.add(dayKey);
    const rememberedToday = [...dayMap.entries()]
      .filter(([lemma, status]) => status === "remembered" && expectedLemmas.has(lemma))
      .map(([lemma]) => lemma);
    ensureReviewTasksForDay(progress, dayKey, rememberedToday);
  }

  return {
    normalizedLemma,
    isDailyCompleted,
    markedTodayCount: markedToday.length,
    dailyTargetCount: dailyWords.length,
    cumulativeMasteredCount: progress.masteredLemmas.size,
  };
};

export const getProgressSummary = (householdCode: string, learnerId: string, now = new Date()) => {
  const progress = getOrCreateProgress(householdCode, learnerId);
  const dayKey = toDayKey(now);
  const dayMap = progress.dayMarks.get(dayKey) ?? new Map<string, StudyStatus>();
  const todayLearnedCount = [...dayMap.values()].filter((status) => status === "remembered").length;
  const quiz = progress.quizStatsByDay.get(dayKey) ?? { correct: 0, total: 0 };
  const todayQuizAccuracy = quiz.total === 0 ? 0 : Math.round((quiz.correct / quiz.total) * 100);
  ensureIncentivePoints(progress);

  return {
    todayLearnedCount,
    todayQuizAccuracy,
    quizCorrectToday: quiz.correct,
    quizTotalToday: quiz.total,
    cumulativeMasteredCount: progress.masteredLemmas.size,
    hasCompletedDailyPlanToday: progress.dailyCompleted.has(dayKey),
    todayIncentivePoints: progress.incentivePointsByDay!.get(dayKey) ?? 0,
  };
};

export const getWrongLemmaCount = (householdCode: string, learnerId: string, now = new Date()) => {
  const progress = getOrCreateProgress(householdCode, learnerId);
  const dayKey = toDayKey(now);
  return (progress.wrongLemmasByDay.get(dayKey) ?? new Set()).size;
};

export const getDueReviews = (householdCode: string, learnerId: string, now = new Date()) => {
  const progress = getOrCreateProgress(householdCode, learnerId);
  const dayKey = toDayKey(now);

  return progress.reviewTasks
    .filter((task) => !task.completedAt && task.dueDate <= dayKey)
    .sort((a, b) => (a.dueDate === b.dueDate ? a.lemma.localeCompare(b.lemma) : a.dueDate.localeCompare(b.dueDate)));
};

export const getReviewQueueState = (householdCode: string, learnerId: string, now = new Date()) => {
  const progress = getOrCreateProgress(householdCode, learnerId);
  const dayKey = toDayKey(now);
  const pending = progress.reviewTasks.filter((task) => !task.completedAt);
  const due = pending
    .filter((task) => task.dueDate <= dayKey)
    .sort((a, b) => (a.dueDate === b.dueDate ? a.lemma.localeCompare(b.lemma) : a.dueDate.localeCompare(b.dueDate)));
  const upcoming = pending
    .filter((task) => task.dueDate > dayKey)
    .sort((a, b) => (a.dueDate === b.dueDate ? a.lemma.localeCompare(b.lemma) : a.dueDate.localeCompare(b.dueDate)));

  return { due, upcoming };
};

/** Snapshot for Review UI + API: queue plus whether today's 50-word plan is done (in-memory store). */
export const getReviewPageSnapshot = (householdCode: string, learnerId: string, now = new Date()) => {
  const progress = getOrCreateProgress(householdCode, learnerId);
  const dayKey = toDayKey(now);
  const dailyWords = getDailyWords(now);
  const dailyTarget = dailyWords.length;
  const expectedLemmas = new Set(dailyWords.map((w) => w.lemma.toLowerCase()));
  const dayMap = progress.dayMarks.get(dayKey) ?? new Map<string, StudyStatus>();
  const markedInDailyPlan = [...dayMap.keys()].filter((lemma) => expectedLemmas.has(lemma)).length;
  const rememberedInDailyPlan = [...dayMap.entries()].filter(
    ([lemma, status]) => expectedLemmas.has(lemma) && status === "remembered",
  ).length;
  const dailyPlanCompleted = progress.dailyCompleted.has(dayKey);
  const queue = getReviewQueueState(householdCode, learnerId, now);
  const totalPendingReviewTasks = progress.reviewTasks.filter((t) => !t.completedAt).length;

  return {
    ...queue,
    dailyTarget,
    markedInDailyPlan,
    rememberedInDailyPlan,
    dailyPlanCompleted,
    totalPendingReviewTasks,
    serverDay: dayKey,
  };
};

export const completeReviewTask = (
  householdCode: string,
  learnerId: string,
  lemma: string,
  intervalDays: 1 | 3 | 7,
  now = new Date(),
) => {
  const progress = getOrCreateProgress(householdCode, learnerId);
  const normalizedLemma = lemma.toLowerCase();
  const task = progress.reviewTasks.find(
    (item) => item.lemma === normalizedLemma && item.intervalDays === intervalDays && !item.completedAt,
  );
  if (!task) return { ok: false as const };
  task.completedAt = now.toISOString();
  return { ok: true as const };
};

export const createQuizSession = (
  householdCode: string,
  learnerId: string,
  scope: QuizScope,
  options?: { batchIndex?: number; now?: Date },
) => {
  const now = options?.now ?? new Date();
  const dayKey = toDayKey(now);
  const dailyWords = getDailyWords(now);
  const allWords = getAllWords();
  const progress = getOrCreateProgress(householdCode, learnerId);

  const wordPoolByScope = (() => {
    if (scope === "batch") {
      const batchIndex = Math.max(options?.batchIndex ?? 0, 0);
      return dailyWords.slice(batchIndex * 10, batchIndex * 10 + 10);
    }
    if (scope === "wrong") {
      const wrongLemmas = [...(progress.wrongLemmasByDay.get(dayKey) ?? new Set<string>())];
      const wrongWords = wrongLemmas
        .map((lemma) => dailyWords.find((word) => word.lemma.toLowerCase() === lemma))
        .filter((word) => Boolean(word));
      return wrongWords.length > 0 ? wrongWords : dailyWords.slice(0, 8);
    }
    return dailyWords;
  })();

  const questionCount = scope === "batch" ? 5 : scope === "daily" ? 10 : 8;
  const selectedWords = rotatePick(wordPoolByScope, questionCount, `${dayKey}-${scope}-${learnerId}`);
  const questions = buildQuestionsForWords(
    selectedWords.filter((w): w is NonNullable<typeof w> => Boolean(w)),
    scope,
    dayKey,
    allWords,
  );

  const sessionId = `qs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  quizSessions.set(sessionId, {
    sessionId,
    householdCode,
    learnerId,
    dayKey,
    scope,
    questions,
    submitted: false,
  });

  return {
    sessionId,
    scope,
    dayKey,
    totalQuestions: questions.length,
    questions: questions.map((question) => toPublicQuestion(question)),
  };
};

export const submitQuizSession = (
  householdCode: string,
  learnerId: string,
  sessionId: string,
  answers: QuizAnswerInput[],
) => {
  const session = quizSessions.get(sessionId);
  if (!session) return { ok: false as const, reason: "Session expired. Please reload quiz." };
  if (session.householdCode !== householdCode || session.learnerId !== learnerId) {
    return { ok: false as const, reason: "Session owner mismatch" };
  }
  if (session.submitted && session.submittedResult) {
    return {
      ok: true as const,
      data: session.submittedResult,
    };
  }
  if (session.submitted) {
    return { ok: false as const, reason: "Session already submitted. Please reload quiz." };
  }

  const progress = getOrCreateProgress(householdCode, learnerId);
  ensureIncentivePoints(progress);
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));
  const wrongSet = getOrCreateWrongSet(progress, session.dayKey);

  let correct = 0;
  const results = session.questions.map((question) => {
    const input = answerMap.get(question.id);
    const selectedOption = input?.selectedOption ?? "";
    const isCorrect = input ? gradeSessionSubmit(question, input) : false;
    if (isCorrect) {
      correct += 1;
      if (session.scope === "wrong") wrongSet.delete(question.lemma.toLowerCase());
    } else {
      wrongSet.add(question.lemma.toLowerCase());
    }
    return {
      questionId: question.id,
      lemma: question.lemma,
      selectedOption,
      correctOption: String(question.answer),
      isCorrect,
    };
  });

  const total = session.questions.length;
  const dayStats = progress.quizStatsByDay.get(session.dayKey) ?? { correct: 0, total: 0 };
  progress.quizStatsByDay.set(session.dayKey, {
    correct: dayStats.correct + correct,
    total: dayStats.total + total,
  });

  const completedScopes = progress.quizCompletedScopesByDay.get(session.dayKey) ?? new Set<QuizScope>();
  const isFirstCompletionOfScope = !completedScopes.has(session.scope);
  completedScopes.add(session.scope);
  progress.quizCompletedScopesByDay.set(session.dayKey, completedScopes);

  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);
  const theme = getThemeByDate(new Date(`${session.dayKey}T12:00:00.000Z`));
  const pointsEarned = isFirstCompletionOfScope ? computeQuizPointsEarned(correct, total) : 0;
  const prevPts = progress.incentivePointsByDay!.get(session.dayKey) ?? 0;
  progress.incentivePointsByDay!.set(session.dayKey, prevPts + pointsEarned);

  const submittedResult = {
    scope: session.scope,
    correct,
    total,
    accuracy,
    results,
    wrongLemmaCount: wrongSet.size,
    pointsEarnedThisQuiz: pointsEarned,
    totalPointsToday: prevPts + pointsEarned,
    badge: getCompletionBadge(theme, accuracy),
    eggLine: getCompletionEggLine(theme, accuracy),
  };
  session.submitted = true;
  session.submittedResult = submittedResult;
  quizSessions.set(sessionId, session);

  return {
    ok: true as const,
    data: submittedResult,
  };
};

export const submitQuizStateless = (
  householdCode: string,
  learnerId: string,
  scope: QuizScope,
  answers: QuizAnswerInput[],
  now = new Date(),
) => {
  const progress = getOrCreateProgress(householdCode, learnerId);
  ensureIncentivePoints(progress);
  const dayKey = toDayKey(now);
  const wrongSet = getOrCreateWrongSet(progress, dayKey);
  const wordMap = new Map(getAllWords().map((word) => [word.lemma.toLowerCase(), word]));

  let correct = 0;
  const results = answers.map((item) => {
    const lemma = item.lemma.toLowerCase();
    const word = wordMap.get(lemma);
    const correctOption = statelessCorrectOption(word, item.kind, item.tfStatement);
    const isCorrect = gradeStatelessAnswer(word, item.kind, item.selectedOption, item.tfStatement);
    if (isCorrect) {
      correct += 1;
      if (scope === "wrong") wrongSet.delete(lemma);
    } else {
      wrongSet.add(lemma);
    }
    return {
      questionId: item.questionId,
      lemma: item.lemma,
      selectedOption: item.selectedOption,
      correctOption,
      isCorrect,
    };
  });

  const total = answers.length;
  const dayStats = progress.quizStatsByDay.get(dayKey) ?? { correct: 0, total: 0 };
  progress.quizStatsByDay.set(dayKey, {
    correct: dayStats.correct + correct,
    total: dayStats.total + total,
  });

  const completedScopes = progress.quizCompletedScopesByDay.get(dayKey) ?? new Set<QuizScope>();
  const isFirstCompletionOfScope = !completedScopes.has(scope);
  completedScopes.add(scope);
  progress.quizCompletedScopesByDay.set(dayKey, completedScopes);

  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);
  const theme = getThemeByDate(new Date(`${dayKey}T12:00:00.000Z`));
  const pointsEarned = isFirstCompletionOfScope ? computeQuizPointsEarned(correct, total) : 0;
  const prevPts = progress.incentivePointsByDay!.get(dayKey) ?? 0;
  progress.incentivePointsByDay!.set(dayKey, prevPts + pointsEarned);

  return {
    scope,
    correct,
    total,
    accuracy,
    results,
    wrongLemmaCount: wrongSet.size,
    pointsEarnedThisQuiz: pointsEarned,
    totalPointsToday: prevPts + pointsEarned,
    badge: getCompletionBadge(theme, accuracy),
    eggLine: getCompletionEggLine(theme, accuracy),
  };
};
