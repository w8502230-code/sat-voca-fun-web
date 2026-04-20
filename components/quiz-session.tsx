"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getApiJsonHeaders } from "@/lib/api-client-headers";
import { incentiveLabels } from "@/lib/incentive";
import { playQuizFeedbackSound } from "@/lib/quiz-feedback-sound";
import type { QuizQuestionPublic } from "@/lib/quiz-engine";
import type { ThemeId } from "@/lib/theme";
import { getAllWords } from "@/lib/word-bank";

type Scope = "batch" | "daily" | "wrong";

type Props = {
  householdCode: string;
  learnerId: string;
  scope: Scope;
  batch?: number;
  theme: ThemeId;
};

type QuizPayload = {
  sessionId: string;
  totalQuestions: number;
  questions: QuizQuestionPublic[];
};

type QuizResultData = {
  correct: number;
  total: number;
  accuracy: number;
  wrongLemmaCount: number;
  pointsEarnedThisQuiz: number;
  totalPointsToday: number;
  badge: { id: string; title: string; subtitle: string } | null;
  eggLine: string | null;
};

export function QuizSession({ householdCode, learnerId, scope, batch, theme }: Props) {
  const [payload, setPayload] = useState<QuizPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResultData | null>(null);
  const [pickFeedback, setPickFeedback] = useState<"correct" | "wrong" | null>(null);

  const labels = incentiveLabels[theme];
  const isHp = theme === "hp_slytherin";
  const accentSelect = isHp
    ? "border-emerald-500 bg-emerald-900/30 text-emerald-100"
    : "border-amber-500 bg-amber-900/35 text-amber-50";

  const lemmaToWord = useMemo(() => {
    const m = new Map(getAllWords().map((w) => [w.lemma.toLowerCase(), w] as const));
    return m;
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      setResult(null);
      setIndex(0);
      setAnswers({});
      setPickFeedback(null);
      const query = new URLSearchParams({
        householdCode,
        learnerId,
        scope,
      });
      if (typeof batch === "number") query.set("batch", String(batch));

      try {
        const response = await fetch(`/api/quiz?${query.toString()}`);
        const data = (await response.json()) as { ok: boolean; data?: QuizPayload; error?: string };
        if (!response.ok || !data.ok || !data.data) {
          setError(data.error ?? "Failed to load quiz session");
          return;
        }
        setPayload(data.data);
      } catch {
        setError("Network error while loading quiz");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [batch, householdCode, learnerId, scope]);

  const current = payload?.questions[index];

  useEffect(() => {
    setPickFeedback(null);
  }, [index]);

  const onPickOption = useCallback(
    (option: string) => {
      if (!current) return;
      const word = lemmaToWord.get(current.lemma.toLowerCase());
      setAnswers((prev) => ({ ...prev, [current.id]: option }));
      if (!word) {
        setPickFeedback(null);
        return;
      }
      let ok: boolean;
      if (current.kind === "cloze") ok = option === word.lemma;
      else {
        const acc = current.statement.trim() === word.enDef.trim();
        const expected = acc ? "True" : "False";
        ok = option === expected;
      }
      setPickFeedback(ok ? "correct" : "wrong");
      playQuizFeedbackSound(ok ? "correct" : "wrong");
    },
    [current, lemmaToWord],
  );

  const canSubmit = useMemo(() => {
    if (!payload) return false;
    return payload.questions.every((q) => Boolean(answers[q.id]));
  }, [answers, payload]);

  const submit = async () => {
    if (!payload || !canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: getApiJsonHeaders(),
        body: JSON.stringify({
          householdCode,
          learnerId,
          scope,
          sessionId: payload.sessionId,
          answers: payload.questions.map((q) => ({
            questionId: q.id,
            lemma: q.lemma,
            selectedOption: answers[q.id],
            kind: q.kind,
            ...(q.kind === "tf" ? { tfStatement: q.statement } : {}),
          })),
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        data?: QuizResultData;
        error?: string;
      };
      if (!response.ok || !data.ok || !data.data) {
        setError(data.error ?? "Failed to submit quiz");
        return;
      }
      setResult(data.data);
    } catch {
      setError("Network error while submitting quiz");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="mt-4 text-sm text-slate-300">Loading quiz...</p>;
  }
  if (error && !payload) {
    return <p className="mt-4 text-sm text-rose-300">{error}</p>;
  }

  if (result) {
    const showBurst = result.accuracy >= 85;
    const confettiPieces = [
      { left: "6%", delay: "0.00s", color: "#fbbf24" },
      { left: "12%", delay: "0.16s", color: "#34d399" },
      { left: "18%", delay: "0.31s", color: "#f472b6" },
      { left: "24%", delay: "0.06s", color: "#93c5fd" },
      { left: "31%", delay: "0.28s", color: "#a5b4fc" },
      { left: "37%", delay: "0.42s", color: "#fb7185" },
      { left: "44%", delay: "0.12s", color: "#fbbf24" },
      { left: "51%", delay: "0.36s", color: "#34d399" },
      { left: "58%", delay: "0.20s", color: "#f472b6" },
      { left: "66%", delay: "0.48s", color: "#93c5fd" },
      { left: "73%", delay: "0.26s", color: "#a5b4fc" },
      { left: "81%", delay: "0.54s", color: "#fb7185" },
      { left: "88%", delay: "0.34s", color: "#fbbf24" },
      { left: "94%", delay: "0.60s", color: "#34d399" },
    ] as const;
    return (
      <section
        className={`relative mt-6 overflow-hidden rounded-xl border p-5 ${
          isHp ? "border-emerald-800/60 bg-emerald-950/25" : "border-amber-800/50 bg-amber-950/20"
        }`}
      >
        {showBurst ? <div className="quiz-completion-burst pointer-events-none" aria-hidden /> : null}
        {showBurst ? (
          <div className="quiz-confetti pointer-events-none" aria-hidden>
            {confettiPieces.map((piece) => (
              <span
                key={`${piece.left}-${piece.delay}`}
                style={{
                  left: piece.left,
                  animationDelay: piece.delay,
                  background: piece.color,
                }}
              />
            ))}
          </div>
        ) : null}
        <h2 className="text-lg font-semibold text-slate-100">Quiz Completed</h2>
        <p className="mt-2 text-sm text-slate-300">
          Score: {result.correct}/{result.total} ({result.accuracy}%)
        </p>
        <p className="mt-1 text-sm text-slate-300">Wrong-word pool: {result.wrongLemmaCount}</p>

        <div
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            isHp ? "border-emerald-700/50 bg-slate-900/60" : "border-amber-700/50 bg-slate-900/60"
          }`}
        >
          <p className="font-medium text-slate-200">
            {labels.pointsName}: +{result.pointsEarnedThisQuiz} (today total {result.totalPointsToday})
          </p>
          {result.pointsEarnedThisQuiz === 0 ? (
            <p className="mt-1 text-xs text-slate-500">
              First completion of each quiz type per UTC day earns {labels.pointsName.toLowerCase()}; repeats show 0
              new.
            </p>
          ) : null}
        </div>

        {result.badge ? (
          <div
            className={`quiz-badge-fireworks relative mt-3 rounded-xl border px-4 py-3 ${
              isHp ? "border-emerald-500/55 bg-emerald-950/35" : "border-amber-500/55 bg-amber-950/35"
            }`}
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-200">{labels.badgeName} unlocked</p>
            <p className={`mt-2 flex items-center gap-2 text-3xl font-semibold leading-none ${isHp ? "text-emerald-200" : "text-amber-200"}`}>
              <span aria-hidden>{isHp ? "🏅" : "🎖️"}</span>
              {result.badge.title}
            </p>
            <p className="mt-2 text-base text-slate-200">{result.badge.subtitle}</p>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-400">
            {labels.badgeName}: keep going, this round did not unlock a badge.
          </div>
        )}

        {result.eggLine ? (
          <p className="mt-3 text-xs italic text-slate-400">
            <span className="font-medium text-slate-300">{labels.eggHint}: </span>
            {result.eggLine}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/result"
            className={`rounded-lg border px-4 py-2 text-sm ${
              isHp ? "border-emerald-700/50 text-emerald-200" : "border-amber-700/50 text-amber-200"
            }`}
          >
            Go to Result
          </Link>
          <Link
            href="/quiz?scope=wrong"
            className={`rounded-lg border px-4 py-2 text-sm ${
              isHp ? "border-emerald-700/40 text-emerald-300/90" : "border-amber-700/40 text-amber-300/90"
            }`}
          >
            Start Wrong Quiz
          </Link>
          <Link href="/study" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200">
            Back to Study
          </Link>
        </div>
      </section>
    );
  }

  if (!payload || !current) {
    return <p className="mt-4 text-sm text-slate-300">No quiz available.</p>;
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-300">
          Scope: <span className="font-semibold uppercase text-slate-100">{scope}</span>
        </p>
        <p className="text-xs text-slate-400">
          {index + 1}/{payload.totalQuestions}
        </p>
      </div>
      <h2 className="text-lg font-semibold text-slate-100">{current.prompt}</h2>
      {current.kind === "tf" ? (
        <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-800/50 px-4 py-3">
          <p className="text-xs font-medium text-slate-500">英文单词</p>
          <p className="mt-1 font-serif text-2xl font-semibold tracking-tight text-slate-50" lang="en">
            {current.lemma}
          </p>
        </div>
      ) : null}
      {current.kind === "cloze" ? (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{current.clozeSentence}</p>
      ) : null}
      {current.kind === "tf" ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-500">英文释义（请判断是否与上方单词一致）</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-200" lang="en">
            {current.statement}
          </p>
        </div>
      ) : null}
      <div className="relative mt-4 space-y-2">
        {current.options.map((option) => {
          const selected = answers[current.id] === option;
          const wrongPick = selected && pickFeedback === "wrong";
          const rightPick = selected && pickFeedback === "correct";
          return (
            <button
              key={option}
              type="button"
              onClick={() => onPickOption(option)}
              className={`relative w-full rounded-lg border px-4 py-2 text-left text-sm transition ${
                selected ? accentSelect : "border-slate-700 bg-slate-800/60 text-slate-200 hover:border-slate-500"
              } ${wrongPick ? "quiz-pick-wrong" : ""} ${rightPick ? "quiz-pick-correct" : ""}`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
          disabled={index === 0}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => setIndex((prev) => Math.min(prev + 1, payload.totalQuestions - 1))}
          disabled={index === payload.totalQuestions - 1}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 disabled:opacity-40"
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSubmit || submitting}
          className={`rounded-lg border px-4 py-2 text-sm disabled:opacity-40 ${
            isHp ? "border-emerald-700/50 text-emerald-200" : "border-amber-700/50 text-amber-200"
          }`}
        >
          {submitting ? "Submitting..." : "Submit Quiz"}
        </button>
      </div>
    </section>
  );
}
