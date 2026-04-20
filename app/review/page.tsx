import { appConfig } from "@/lib/config";
import { getReviewPageSnapshot } from "@/lib/progress-store";
import { ReviewQueueClient } from "@/components/review-queue-client";

export const dynamic = "force-dynamic";

export default function ReviewPage() {
  const snapshot = getReviewPageSnapshot(appConfig.householdCode, appConfig.learnerId);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 sm:px-8">
      <h1 className="text-2xl font-semibold text-slate-100">Review Queue</h1>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        1/3/7 review tasks appear only after the full daily mission is completed.
      </p>
      <ReviewQueueClient
        householdCode={appConfig.householdCode}
        learnerId={appConfig.learnerId}
        initialTasks={snapshot.due}
        initialUpcomingTasks={snapshot.upcoming}
        initialSnapshot={{
          dailyTarget: snapshot.dailyTarget,
          markedInDailyPlan: snapshot.markedInDailyPlan,
          dailyPlanCompleted: snapshot.dailyPlanCompleted,
          totalPendingReviewTasks: snapshot.totalPendingReviewTasks,
          serverDay: snapshot.serverDay,
        }}
      />
    </main>
  );
}
