import { NextRequest, NextResponse } from "next/server";

import { validateHouseholdCode } from "@/lib/auth";
import { getWordBankCount } from "@/lib/word-bank";
import { getProgressSummary } from "@/lib/progress-store";

export async function GET(request: NextRequest) {
  const householdCode = request.nextUrl.searchParams.get("householdCode");
  const learnerId = request.nextUrl.searchParams.get("learnerId");
  const householdCheck = validateHouseholdCode(householdCode);

  if (!householdCheck.ok) {
    return NextResponse.json(
      { ok: false, error: householdCheck.message },
      { status: householdCheck.status },
    );
  }

  if (!learnerId) {
    return NextResponse.json(
      { ok: false, error: "learnerId is required" },
      { status: 400 },
    );
  }

  const summary = getProgressSummary(householdCode!, learnerId);

  // Placeholder response until database integration lands.
  return NextResponse.json({
    ok: true,
    data: {
      todayLearnedCount: summary.todayLearnedCount,
      todayQuizAccuracy: summary.todayQuizAccuracy,
      quizCorrectToday: summary.quizCorrectToday,
      quizTotalToday: summary.quizTotalToday,
      cumulativeMasteredCount: summary.cumulativeMasteredCount,
      totalWordBankCount: getWordBankCount(),
      hasCompletedDailyPlanToday: summary.hasCompletedDailyPlanToday,
      todayIncentivePoints: summary.todayIncentivePoints,
      definition: "Historical all mastered lemmas, deduped by lemma.",
    },
  });
}
