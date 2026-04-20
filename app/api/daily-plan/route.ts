import { NextRequest, NextResponse } from "next/server";

import { validateHouseholdCode } from "@/lib/auth";
import { getThemeByDate } from "@/lib/theme";
import { getDailyWords } from "@/lib/word-bank";

export async function GET(request: NextRequest) {
  const householdCode = request.nextUrl.searchParams.get("householdCode");
  const dateParam = request.nextUrl.searchParams.get("date");

  const householdCheck = validateHouseholdCode(householdCode);
  if (!householdCheck.ok) {
    return NextResponse.json(
      { ok: false, error: householdCheck.message },
      { status: householdCheck.status },
    );
  }

  const date = dateParam ? new Date(dateParam) : new Date();
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid date" }, { status: 400 });
  }

  const words = getDailyWords(date);
  return NextResponse.json({
    ok: true,
    data: {
      date: date.toISOString().slice(0, 10),
      theme: getThemeByDate(date),
      targetCount: words.length,
      words,
    },
  });
}
