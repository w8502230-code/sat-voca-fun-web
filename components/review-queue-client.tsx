"use client";

import { useEffect, useMemo, useState } from "react";

import { getApiJsonHeaders } from "@/lib/api-client-headers";

type ReviewTask = {
  lemma: string;
  dueDate: string;
  intervalDays: 1 | 3 | 7;
};

type Snapshot = {
  dailyTarget: number;
  markedInDailyPlan: number;
  dailyPlanCompleted: boolean;
  totalPendingReviewTasks: number;
  serverDay: string;
};

type QueuePayload = {
  due: ReviewTask[];
  upcoming: ReviewTask[];
} & Snapshot;

type Props = {
  householdCode: string;
  learnerId: string;
  initialTasks: ReviewTask[];
  initialUpcomingTasks: ReviewTask[];
  initialSnapshot: Snapshot;
};

export function ReviewQueueClient({
  householdCode,
  learnerId,
  initialTasks,
  initialUpcomingTasks,
  initialSnapshot,
}: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [upcomingTasks, setUpcomingTasks] = useState(initialUpcomingTasks);
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refetching, setRefetching] = useState(false);

  const dueCount = useMemo(() => tasks.length, [tasks.length]);

  const refreshQueue = async () => {
    setRefetching(true);
    setError(null);
    try {
      const query = new URLSearchParams({ householdCode, learnerId });
      const response = await fetch(`/api/review/queue?${query.toString()}`);
      const json = (await response.json()) as {
        ok?: boolean;
        data?: QueuePayload;
        error?: string;
      };
      if (!response.ok || !json.ok || !json.data) {
        setError(json.error ?? "Failed to load review queue");
        return;
      }
      setTasks(json.data.due);
      setUpcomingTasks(json.data.upcoming);
      setSnapshot({
        dailyTarget: json.data.dailyTarget,
        markedInDailyPlan: json.data.markedInDailyPlan,
        dailyPlanCompleted: json.data.dailyPlanCompleted,
        totalPendingReviewTasks: json.data.totalPendingReviewTasks,
        serverDay: json.data.serverDay,
      });
    } catch {
      setError("Network error while loading review queue");
    } finally {
      setRefetching(false);
    }
  };

  useEffect(() => {
    void refreshQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount / identity of learner
  }, [householdCode, learnerId]);

  const completeTask = async (task: ReviewTask) => {
    const key = `${task.lemma}-${task.intervalDays}-${task.dueDate}`;
    if (busyKey) return;
    setBusyKey(key);
    setError(null);

    try {
      const response = await fetch("/api/review/complete", {
        method: "POST",
        headers: getApiJsonHeaders(),
        body: JSON.stringify({
          householdCode,
          learnerId,
          lemma: task.lemma,
          intervalDays: task.intervalDays,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!response.ok || !data?.ok) {
        setError(data?.error ?? "Failed to complete review task");
        return;
      }

      await refreshQueue();
    } catch {
      setError("Network error while completing review task");
    } finally {
      setBusyKey(null);
    }
  };

  const emptyHint = () => {
    if (!snapshot.dailyPlanCompleted) {
      return (
        <p className="text-sm text-slate-300">
          Today&apos;s plan not finished yet: {snapshot.markedInDailyPlan}/{snapshot.dailyTarget} words
          marked in the daily list. Finish all {snapshot.dailyTarget} words on{" "}
          <a href="/study" className="font-medium text-emerald-300 underline">
            Study
          </a>{" "}
          to unlock 1/3/7 review scheduling.
        </p>
      );
    }
    if (snapshot.totalPendingReviewTasks === 0) {
      return (
        <p className="text-sm text-slate-300">
          Daily plan is complete, but no review rows are in memory (dev server may have restarted). Do a
          fresh pass on Study today or restart marks to regenerate tasks.
        </p>
      );
    }
    const firstDue = upcomingTasks[0]?.dueDate;
    return (
      <div className="space-y-2 text-sm text-slate-300">
        <p>
          <span className="font-semibold text-emerald-300">
            {snapshot.totalPendingReviewTasks} review task(s) scheduled
          </span>{" "}
          from today&apos;s remembered words. Spaced repetition uses calendar due dates, so{" "}
          <span className="font-semibold text-slate-100">none are due on the same UTC day</span> you finish
          the mission (first batch typically D+1).
        </p>
        {firstDue ? (
          <p className="text-xs text-slate-400">
            Earliest due date in queue: <span className="font-mono text-slate-200">{firstDue}</span> (UTC).
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6">
      <p className="mb-1 text-xs text-slate-400">Server day (UTC): {snapshot.serverDay}</p>
      <p className="mb-3 text-sm leading-7 text-slate-300">
        Daily plan: {snapshot.markedInDailyPlan}/{snapshot.dailyTarget}{" "}
        {snapshot.dailyPlanCompleted ? (
          <span className="text-emerald-300">(complete)</span>
        ) : (
          <span className="text-amber-300">(in progress)</span>
        )}
        {refetching ? <span className="ml-2 text-slate-500">Updating…</span> : null}
      </p>
      <p className="mb-3 text-sm leading-7 text-slate-300">
        Current due tasks: <span className="font-semibold text-slate-100">{dueCount}</span>
      </p>
      {tasks.length === 0 ? (
        <div>
          {emptyHint()}
          {snapshot.dailyPlanCompleted && upcomingTasks.length > 0 ? (
            <p className="mt-3 text-xs font-medium text-emerald-300">
              Upcoming (not due yet on server day): {upcomingTasks.length} — open the list below.
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => {
            const key = `${task.lemma}-${task.intervalDays}-${task.dueDate}`;
            const isBusy = busyKey === key;

            return (
              <li key={key} className="rounded-lg border border-slate-700 bg-slate-800/70 p-3">
                <p className="text-sm font-medium text-slate-100">{task.lemma}</p>
                <p className="mt-1 text-xs text-slate-300">
                  Due: {task.dueDate} | Interval: D+{task.intervalDays}
                </p>
                <button
                  type="button"
                  onClick={() => void completeTask(task)}
                  disabled={Boolean(busyKey)}
                  className="mt-2 rounded-md border border-emerald-700/50 px-3 py-1.5 text-xs text-emerald-200 disabled:opacity-40"
                >
                  {isBusy ? "Completing..." : "Mark Review Complete"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {upcomingTasks.length > 0 ? (
        <details className="mt-4 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-200">
            View upcoming tasks ({upcomingTasks.length})
          </summary>
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
            {upcomingTasks.slice(0, 40).map((task) => (
              <li
                key={`upcoming-${task.lemma}-${task.intervalDays}-${task.dueDate}`}
                className="text-xs text-slate-300"
              >
                {task.lemma} — due {task.dueDate} (D+{task.intervalDays})
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
    </section>
  );
}
