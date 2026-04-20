import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { appConfig } from "@/lib/config";
import { incentiveLabels } from "@/lib/incentive";
import { getProgressSummary, getWrongLemmaCount } from "@/lib/progress-store";
import { getThemeByDate, themeDetails } from "@/lib/theme";
import { getWordBankCount } from "@/lib/word-bank";

export const dynamic = "force-dynamic";

export default function ResultPage() {
  noStore();
  const now = new Date();
  const theme = getThemeByDate(now);
  const themeMeta = themeDetails[theme];
  const labels = incentiveLabels[theme];
  const isHp = theme === "hp_slytherin";

  const totalWords = getWordBankCount();
  const progress = getProgressSummary(appConfig.householdCode, appConfig.learnerId);
  const wrongCount = getWrongLemmaCount(appConfig.householdCode, appConfig.learnerId);

  const accent = isHp ? "text-emerald-300" : "text-amber-300";

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 sm:px-8">
      <h1 className="text-2xl font-semibold text-slate-100">Progress Panel</h1>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        Historical cumulative mastered count is defined as all-time mastered lemmas deduped by
        lemma.
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        Household mode is active with code <span className="font-semibold">{appConfig.householdCode}</span>.
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        Active theme: <span className={`font-semibold ${accent}`}>{themeMeta.shortName}</span>.
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        Current imported word bank size: <span className="font-semibold">{totalWords}</span>.
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        Today remembered count: <span className="font-semibold">{progress.todayLearnedCount}</span>.
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        Daily 50-word plan completed today:{" "}
        <span className="font-semibold">{progress.hasCompletedDailyPlanToday ? "Yes" : "No"}</span>.
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        Cumulative mastered count: <span className="font-semibold">{progress.cumulativeMasteredCount}</span>.
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        Today quiz score (correct / total):{" "}
        <span className="font-semibold">
          {progress.quizCorrectToday}/{progress.quizTotalToday}
        </span>{" "}
        → accuracy <span className="font-semibold">{progress.todayQuizAccuracy}%</span>.
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        {labels.pointsName} (today): <span className="font-semibold">{progress.todayIncentivePoints}</span>.
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        Current wrong-word pool: <span className="font-semibold">{wrongCount}</span>.
      </p>

      <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-800 pt-6">
        <Link
          href="/study"
          className={`rounded-lg border px-4 py-2 text-sm ${
            isHp ? "border-emerald-700/50 text-emerald-200" : "border-amber-700/50 text-amber-200"
          }`}
        >
          Continue Study
        </Link>
        <Link
          href="/quiz?scope=daily"
          className={`rounded-lg border px-4 py-2 text-sm ${
            isHp ? "border-emerald-700/40 text-emerald-300/90" : "border-amber-700/40 text-amber-300/90"
          }`}
        >
          Daily Quiz
        </Link>
        <Link
          href="/quiz?scope=wrong"
          className={`rounded-lg border px-4 py-2 text-sm ${
            isHp ? "border-emerald-700/40 text-emerald-300/90" : "border-amber-700/40 text-amber-300/90"
          }`}
        >
          Wrong Quiz
        </Link>
        <Link href="/review" className="rounded-lg border border-cyan-800/50 px-4 py-2 text-sm text-cyan-200">
          Review Queue
        </Link>
        <Link href="/" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200">
          Home
        </Link>
      </div>
    </main>
  );
}
