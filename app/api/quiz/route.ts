import { NextRequest, NextResponse } from "next/server";

import { validateHouseholdCode } from "@/lib/auth";
import { createQuizSession } from "@/lib/progress-store";

export async function GET(request: NextRequest) {
  const householdCode = request.nextUrl.searchParams.get("householdCode");
  const learnerId = request.nextUrl.searchParams.get("learnerId");
  const scopeParam = request.nextUrl.searchParams.get("scope");
  const batchParam = request.nextUrl.searchParams.get("batch");

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

  if (scopeParam !== "batch" && scopeParam !== "daily" && scopeParam !== "wrong") {
    return NextResponse.json({ ok: false, error: "scope must be batch|daily|wrong" }, { status: 400 });
  }

  const batchIndex = scopeParam === "batch" ? Math.max(Number(batchParam ?? "1") - 1, 0) : undefined;
  const session = createQuizSession(householdCode!, learnerId, scopeParam, { batchIndex });

  return NextResponse.json({ ok: true, data: session });
}
