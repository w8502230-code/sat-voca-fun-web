"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { StudyFlashcardPreview } from "@/components/study-flashcard-preview";
import { getApiJsonHeaders } from "@/lib/api-client-headers";
import type { ThemeId } from "@/lib/theme";
import type { WordEntry } from "@/lib/word-bank";

type Props = {
  batches: WordEntry[][];
  theme: ThemeId;
  householdCode: string;
  learnerId: string;
};

export function StudyBatchMission({ batches, theme, householdCode, learnerId }: Props) {
  const isDev = process.env.NODE_ENV !== "production";
  const [batchIndex, setBatchIndex] = useState(0);
  const [completedBatches, setCompletedBatches] = useState<Record<number, boolean>>({});
  const [completionHint, setCompletionHint] = useState<string | null>(null);
  const [devDailyBusy, setDevDailyBusy] = useState(false);

  const batchCount = batches.length;
  const currentBatch = batches[batchIndex] ?? [];
  const isCurrentBatchCompleted = Boolean(completedBatches[batchIndex]);
  const allCompleted = useMemo(
    () => batchCount > 0 && Object.keys(completedBatches).length >= batchCount,
    [batchCount, completedBatches],
  );

  const devQuickCompleteFullDaily = async () => {
    const flat = batches.flat();
    if (flat.length === 0 || devDailyBusy) return;
    setDevDailyBusy(true);
    setCompletionHint(null);
    try {
      for (const word of flat) {
        const response = await fetch("/api/study/mark", {
          method: "POST",
          headers: getApiJsonHeaders(),
          body: JSON.stringify({
            householdCode,
            learnerId,
            lemma: word.lemma,
            status: "remembered",
            occurredAt: new Date().toISOString(),
          }),
        });
        if (!response.ok) {
          const err = (await response.json().catch(() => null)) as { error?: string } | null;
          setCompletionHint(err?.error ?? "Dev daily quick-complete failed.");
          return;
        }
      }
      const done: Record<number, boolean> = {};
      for (let i = 0; i < batches.length; i += 1) done[i] = true;
      setCompletedBatches(done);
      setCompletionHint(
        "Dev: all daily words marked remembered. Open Review — tasks are due from D+1 (UTC), not same day.",
      );
    } catch {
      setCompletionHint("Network error during dev daily quick-complete.");
    } finally {
      setDevDailyBusy(false);
    }
  };

  const handleBatchCompleted = () => {
    setCompletedBatches((prev) => {
      if (prev[batchIndex]) return prev;
      return { ...prev, [batchIndex]: true };
    });

    if (batchIndex < batchCount - 1) {
      setBatchIndex((prev) => prev + 1);
      setCompletionHint(`Batch ${batchIndex + 1} completed. Entered Batch ${batchIndex + 2}.`);
      return;
    }
    setCompletionHint("All batches completed today. You can go to result or return home.");
  };

  return (
    <section className="mt-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-200">
            Current batch: <span className="font-semibold">{batchIndex + 1}</span> / {batchCount}
          </p>
          <p className="text-xs text-slate-400">
            Completed: {Object.keys(completedBatches).length}/{batchCount}
          </p>
        </div>
        {completionHint ? <p className="mt-2 text-xs text-emerald-300">{completionHint}</p> : null}
        {isDev ? (
          <button
            type="button"
            disabled={devDailyBusy || batches.flat().length === 0}
            onClick={() => void devQuickCompleteFullDaily()}
            className="mt-3 w-full rounded-lg border border-sky-700/50 bg-sky-900/25 px-3 py-2 text-xs text-sky-200 disabled:opacity-40 sm:w-auto"
          >
            {devDailyBusy ? "Marking full daily list…" : "Dev Quick Complete Full Daily (all batches)"}
          </button>
        ) : null}
      </div>

      <StudyFlashcardPreview
        key={`batch-${batchIndex}`}
        words={currentBatch}
        theme={theme}
        householdCode={householdCode}
        learnerId={learnerId}
        onBatchCompleted={handleBatchCompleted}
      />

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setBatchIndex((prev) => Math.max(prev - 1, 0))}
          disabled={batchIndex === 0}
          className="rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous Batch
        </button>
        <button
          type="button"
          onClick={() => setBatchIndex((prev) => Math.min(prev + 1, batchCount - 1))}
          disabled={batchIndex >= batchCount - 1 || !isCurrentBatchCompleted}
          className="rounded-lg border border-emerald-700/60 bg-emerald-900/35 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-800/70 disabled:text-slate-300 disabled:opacity-100"
        >
          Next Batch
        </button>
        <Link
          href={isCurrentBatchCompleted ? `/quiz?scope=batch&batch=${batchIndex + 1}` : "/"}
          className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
        >
          {isCurrentBatchCompleted ? "Start Batch Quiz" : "Back to Homepage"}
        </Link>
      </div>

      {allCompleted ? (
        <div className="mt-3 rounded-lg border border-emerald-600/50 bg-slate-900/85 p-3">
          <p className="text-sm text-emerald-100">
            Daily mission complete. Run daily quiz and wrong-word retry before final summary.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link href="/quiz?scope=daily" className="text-sm font-semibold text-emerald-300 underline decoration-emerald-400/60">
              Start Daily Quiz →
            </Link>
            <Link href="/quiz?scope=wrong" className="text-sm font-semibold text-amber-300 underline decoration-amber-400/60">
              Start Wrong Quiz →
            </Link>
            <Link href="/result" className="text-sm font-semibold text-slate-200 underline decoration-slate-400/60">
              Go to Result →
            </Link>
            <Link href="/review" className="text-sm font-semibold text-cyan-300 underline decoration-cyan-400/60">
              Review queue →
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <Link href="/quiz?scope=wrong" className="text-xs font-medium text-amber-300">
            Need extra practice? Start wrong-word quiz
          </Link>
        </div>
      )}
    </section>
  );
}
