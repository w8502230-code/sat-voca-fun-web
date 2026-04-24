"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { formatClientApiError, getApiJsonHeaders } from "@/lib/api-client-headers";
import { enqueueOfflineStudyMark } from "@/lib/offline-queue";
import type { ThemeId } from "@/lib/theme";
import { themeDetails } from "@/lib/theme";
import { getStudyThemeMarkFallbackSrc, getStudyThemeMarkSrc } from "@/lib/theme-assets";
import type { WordEntry } from "@/lib/word-bank";

type Props = {
  words: WordEntry[];
  theme: ThemeId;
  householdCode: string;
  learnerId: string;
  onBatchCompleted?: () => void;
};

type MarkStatus = "remembered" | "forgotten";

export function StudyFlashcardPreview({
  words,
  theme,
  householdCode,
  learnerId,
  onBatchCompleted,
}: Props) {
  const isDev = process.env.NODE_ENV !== "production";
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [marks, setMarks] = useState<Record<string, MarkStatus>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [batchCompleteEmitted, setBatchCompleteEmitted] = useState(false);
  const currentTheme = themeDetails[theme];
  const isHp = theme === "hp_slytherin";
  const [studyThemeMarkSrc, setStudyThemeMarkSrc] = useState(getStudyThemeMarkSrc(theme));
  const fallbackStudyThemeMarkSrc = getStudyThemeMarkFallbackSrc(theme);
  const studyMarkImgLg = isHp
    ? "h-14 w-14 rounded-lg border border-emerald-500/70 bg-emerald-950/40 object-contain p-1 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
    : "h-14 w-14 rounded-lg border border-amber-500/70 bg-amber-950/40 object-contain p-1 shadow-[0_0_18px_rgba(245,158,11,0.35)]";
  const studyMarkImgSm = isHp
    ? "h-10 w-10 rounded-md border border-emerald-600/70 bg-emerald-950/60 object-contain p-0.5"
    : "h-10 w-10 rounded-md border border-amber-600/70 bg-amber-950/60 object-contain p-0.5";

  const current = words[index];
  const satExampleEn = current?.enExampleSat?.trim() || current?.enDef || "";
  const satExampleZh = current?.zhExampleSat?.trim();
  const progress = words.length === 0 ? 0 : Math.round(((index + 1) / words.length) * 100);

  const stats = useMemo(() => {
    const values = Object.values(marks);
    return {
      remembered: values.filter((v) => v === "remembered").length,
      forgotten: values.filter((v) => v === "forgotten").length,
    };
  }, [marks]);

  const markedInBatch = useMemo(
    () => words.reduce((acc, w) => acc + (marks[w.lemma] ? 1 : 0), 0),
    [marks, words],
  );

  const moveTo = (next: number) => {
    setIndex(next);
    setIsFlipped(false);
  };

  useEffect(() => {
    setIndex(0);
    setIsFlipped(false);
    setMarks({});
    setSubmitError(null);
    setBatchCompleteEmitted(false);
    setStudyThemeMarkSrc(getStudyThemeMarkSrc(theme));
  }, [theme, words]);

  useEffect(() => {
    if (!onBatchCompleted || batchCompleteEmitted || words.length === 0) return;
    const allMarked = words.every((w) => Boolean(marks[w.lemma]));
    if (allMarked) {
      onBatchCompleted();
      setBatchCompleteEmitted(true);
    }
  }, [batchCompleteEmitted, marks, onBatchCompleted, words]);

  const onMark = async (status: MarkStatus) => {
    if (!current) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/study/mark", {
        method: "POST",
        headers: getApiJsonHeaders(),
        body: JSON.stringify({
          householdCode,
          learnerId,
          lemma: current.lemma,
          status,
          occurredAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | { error?: unknown }
          | null;
        setSubmitError(
          formatClientApiError(
            errorPayload?.error,
            "Save failed. Please try again.",
          ),
        );
        return;
      }

      setMarks((prev) => ({ ...prev, [current.lemma]: status }));
    } catch {
      const occurredAtIso = new Date().toISOString();
      enqueueOfflineStudyMark({
        householdCode,
        learnerId,
        lemma: current.lemma,
        status,
        occurredAtIso,
      });
      setMarks((prev) => ({ ...prev, [current.lemma]: status }));
      setSubmitError("Offline — queued for sync when you are back online.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickCompleteBatch = async () => {
    if (isSubmitting || words.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      for (const word of words) {
        if (marks[word.lemma]) continue;
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
          const errorPayload = (await response.json().catch(() => null)) as
            | { error?: unknown }
            | null;
          setSubmitError(
            formatClientApiError(
              errorPayload?.error,
              "Quick complete failed.",
            ),
          );
          return;
        }
      }

      setMarks((prev) => {
        const next = { ...prev };
        for (const word of words) {
          if (!next[word.lemma]) next[word.lemma] = "remembered";
        }
        return next;
      });
    } catch {
      const iso = new Date().toISOString();
      for (const word of words) {
        if (marks[word.lemma]) continue;
        enqueueOfflineStudyMark({
          householdCode,
          learnerId,
          lemma: word.lemma,
          status: "remembered",
          occurredAtIso: iso,
        });
      }
      setMarks((prev) => {
        const next = { ...prev };
        for (const word of words) {
          if (!next[word.lemma]) next[word.lemma] = "remembered";
        }
        return next;
      });
      setSubmitError("Offline — queued remembered marks for sync.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!current) {
    return (
      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <p className="text-sm text-slate-300">No words are loaded for today.</p>
      </section>
    );
  }

  return (
    <section
      className={`study-shell mt-6 rounded-xl border p-4 sm:p-6 ${
        isHp
          ? "study-shell-hp border-emerald-800/60 bg-gradient-to-b from-emerald-950/60 to-slate-900/80"
          : "study-shell-r99 border-amber-800/60 bg-gradient-to-b from-amber-950/40 to-slate-900/80"
      }`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-xl ${
          isHp
            ? "bg-[repeating-linear-gradient(135deg,rgba(16,185,129,0.18)_0px,rgba(16,185,129,0.18)_3px,transparent_3px,transparent_14px)]"
            : "bg-[repeating-linear-gradient(45deg,rgba(245,158,11,0.16)_0px,rgba(245,158,11,0.16)_3px,transparent_3px,transparent_14px)]"
        }`}
      />

      <div className="relative z-10 mb-3 flex items-center justify-end">
        <Image
          src={studyThemeMarkSrc}
          alt=""
          width={56}
          height={56}
          className={studyMarkImgLg}
          onError={() => setStudyThemeMarkSrc(fallbackStudyThemeMarkSrc)}
          unoptimized
        />
      </div>

      <div className="relative z-10 mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Image
              src={studyThemeMarkSrc}
              alt=""
              width={40}
              height={40}
              className={studyMarkImgSm}
              onError={() => setStudyThemeMarkSrc(fallbackStudyThemeMarkSrc)}
              unoptimized
            />
            {currentTheme.missionLabel}
          </h2>
          <p className="text-xs text-slate-400">
            Theme accents: {currentTheme.cardAccent} | Scene: {currentTheme.cardBackdrop}
          </p>
        </div>
        <div className="text-right text-xs text-slate-400">
          <p>
            Card {index + 1}/{words.length}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Marked {markedInBatch}/{words.length}
          </p>
        </div>
      </div>

      <div className="relative z-10 mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <button
        type="button"
        onClick={() => setIsFlipped((v) => !v)}
        className={`study-card relative z-10 w-full rounded-2xl border p-5 text-left shadow-lg transition ${
          isHp
            ? "study-card-hp border-emerald-800/70 bg-slate-950/80 hover:border-emerald-500/70"
            : "study-card-r99 border-amber-800/70 bg-slate-950/80 hover:border-amber-500/70"
        }`}
      >
        {!isFlipped ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {currentTheme.flipFrontLabel}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{current.lemma}</p>
            <p className="mt-1 text-sm text-slate-400">{current.pos}</p>
            <p className={`mt-4 text-xs ${isHp ? "text-emerald-300" : "text-amber-300"}`}>
              {currentTheme.flipHint}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {currentTheme.flipBackLabel}
            </p>
            <p className="mt-2 text-base font-medium text-slate-100">{current.cnDef}</p>
            <p className="mt-2 text-sm text-slate-300">{current.enDef}</p>
            <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">SAT Standard Sentence</p>
            <p className="mt-1 text-sm text-slate-200">{satExampleEn}</p>
            {satExampleZh ? (
              <p className="mt-1 text-sm text-slate-400">{satExampleZh}</p>
            ) : null}
            <p className={`mt-4 text-xs ${isHp ? "text-emerald-300" : "text-amber-300"}`}>
              {currentTheme.flipBackHint}
            </p>
          </div>
        )}
      </button>

      <div className="relative z-10 mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void onMark("forgotten")}
          className={`mystic-action-btn rounded-lg border px-4 py-2 text-sm font-medium ${
            isHp
              ? "border-slate-600 bg-slate-800/60 text-slate-200 hover:bg-slate-700/60"
              : "border-rose-700/50 bg-rose-900/20 text-rose-200 hover:bg-rose-900/30"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <span className={`mystic-btn ${isHp ? "mystic-btn-hp" : "mystic-btn-r99"}`}>
            {currentTheme.forgottenLabel}
          </span>
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void onMark("remembered")}
          className={`mystic-action-btn rounded-lg border px-4 py-2 text-sm font-medium ${
            isHp
              ? "border-emerald-700/50 bg-emerald-900/20 text-emerald-200 hover:bg-emerald-900/30"
              : "border-amber-700/50 bg-amber-900/20 text-amber-200 hover:bg-amber-900/30"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <span className={`mystic-btn ${isHp ? "mystic-btn-hp" : "mystic-btn-r99"}`}>
            {currentTheme.rememberedLabel}
          </span>
        </button>
      </div>

      <div className="relative z-10 mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => moveTo(Math.max(index - 1, 0))}
          className={`mystic-action-btn rounded-lg border px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-40 ${
            isHp
              ? "border-emerald-900/60 bg-emerald-950/20 hover:bg-emerald-900/30"
              : "border-amber-900/60 bg-amber-950/20 hover:bg-amber-900/30"
          }`}
        >
          <span className={`mystic-btn ${isHp ? "mystic-btn-hp" : "mystic-btn-r99"}`}>Previous</span>
        </button>
        <button
          type="button"
          disabled={index === words.length - 1}
          onClick={() => moveTo(Math.min(index + 1, words.length - 1))}
          className={`mystic-action-btn rounded-lg border px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-40 ${
            isHp
              ? "border-emerald-900/60 bg-emerald-950/20 hover:bg-emerald-900/30"
              : "border-amber-900/60 bg-amber-950/20 hover:bg-amber-900/30"
          }`}
        >
          <span className={`mystic-btn ${isHp ? "mystic-btn-hp" : "mystic-btn-r99"}`}>Next</span>
        </button>
      </div>

      {isDev ? (
        <button
          type="button"
          onClick={() => void quickCompleteBatch()}
          disabled={isSubmitting}
          className="relative z-10 mt-3 rounded-lg border border-sky-700/50 bg-sky-900/20 px-4 py-2 text-xs text-sky-200 disabled:opacity-40"
        >
          Dev Quick Complete This Batch
        </button>
      ) : null}

      <p className="relative z-10 mt-4 text-xs text-slate-400">
        Marked in this preview - positive marks: {stats.remembered}, retry marks: {stats.forgotten}
      </p>
      {submitError ? (
        <p className="relative z-10 mt-2 rounded-md border border-rose-500/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-100" role="alert">
          {submitError}
        </p>
      ) : null}
      <p className="relative z-10 mt-1 text-[11px] text-slate-500">
        On Reverse:1999 days, action labels switch to Rune Decoded / Needs Re-analysis.
      </p>
    </section>
  );
}
