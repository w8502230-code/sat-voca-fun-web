import { NextRequest, NextResponse } from "next/server";

import { validateHouseholdCode } from "@/lib/auth";
import { getReviewPageSnapshot } from "@/lib/progress-store";

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
    return NextResponse.json({ ok: false, error: "learnerId is required" }, { status: 400 });
  }

  const snapshot = getReviewPageSnapshot(householdCode!, learnerId);
  return NextResponse.json({ ok: true, data: snapshot });
}
