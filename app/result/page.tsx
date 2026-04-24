import Image from "next/image";
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
  const showConfetti = progress.todayQuizAccuracy > 85;
  const snitchMilestones = new Set(Array.from({ length: 14 }, (_, i) => (i + 1) * 200));
  const showSnitchBurst = snitchMilestones.has(progress.cumulativeMasteredCount);
  const snitchCount = progress.cumulativeMasteredCount >= 1000 ? 4 : 3;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 sm:px-8">
      <section className="result-panel relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/75 p-5 sm:p-6">
        {showConfetti ? (
          <div className="result-confetti" aria-hidden>
            {Array.from({ length: 18 }).map((_, idx) => (
              <span
                key={`confetti-${idx}`}
                style={{
                  left: `${(idx * 11) % 100}%`,
                  animationDelay: `${(idx % 6) * 0.15}s`,
                  animationDuration: `${1.7 + (idx % 5) * 0.18}s`,
                }}
              />
            ))}
          </div>
        ) : null}

        {showSnitchBurst ? (
          <div className="result-snitch-burst" aria-hidden>
            {Array.from({ length: snitchCount }).map((_, idx) => (
              <Image
                key={`snitch-${idx}`}
                src="/golden-snitch.png"
                alt=""
                width={96}
                height={96}
                className="result-snitch"
                style={{
                  top: `${14 + idx * 16}%`,
                  animationDelay: `${idx * 0.33}s`,
                  animationDuration: `${5.8 + idx * 0.6}s`,
                }}
                unoptimized
              />
            ))}
          </div>
        ) : null}

        <div className="relative z-10">
          <h1 className="text-2xl font-semibold text-slate-100">Progress Panel</h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Historical cumulative mastered count is defined as all-time mastered lemmas deduped by
            lemma.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Household</p>
            <p className="mt-1 text-base text-slate-100">
              Code <span className="font-semibold">{appConfig.householdCode}</span>
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Active theme: <span className={`font-semibold ${accent}`}>{themeMeta.shortName}</span>
            </p>
          </article>
          <article className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Word Bank</p>
            <p className="mt-1 text-base text-slate-100">
              Imported size <span className="font-semibold">{totalWords}</span>
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Cumulative mastered <span className="font-semibold text-slate-100">{progress.cumulativeMasteredCount}</span>
            </p>
          </article>
          <article className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Today Study</p>
            <p className="mt-1 text-base text-slate-100">
              Remembered <span className="font-semibold">{progress.todayLearnedCount}</span>
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Daily 50-word plan <span className="font-semibold text-slate-100">{progress.hasCompletedDailyPlanToday ? "Completed" : "Not completed"}</span>
            </p>
          </article>
          <article className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Today Quiz</p>
            <p className="mt-1 text-base text-slate-100">
              Score <span className="font-semibold">{progress.quizCorrectToday}/{progress.quizTotalToday}</span>
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Accuracy <span className={`font-semibold ${progress.todayQuizAccuracy > 85 ? "text-emerald-300" : "text-slate-100"}`}>{progress.todayQuizAccuracy}%</span>
            </p>
          </article>
          <article className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Incentive</p>
            <p className="mt-1 text-base text-slate-100">
              {labels.pointsName} today <span className="font-semibold">{progress.todayIncentivePoints}</span>
            </p>
          </article>
          <article className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Wrong-word Pool</p>
            <p className="mt-1 text-base text-slate-100">
              Current size <span className="font-semibold">{wrongCount}</span>
            </p>
          </article>
          </div>
        </div>
      </section>

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
