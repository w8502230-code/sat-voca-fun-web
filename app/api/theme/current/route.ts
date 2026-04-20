import { NextResponse } from "next/server";

import { getThemeByDate, themeDetails } from "@/lib/theme";

export async function GET() {
  const now = new Date();
  const theme = getThemeByDate(now);
  const detail = themeDetails[theme];

  return NextResponse.json({
    ok: true,
    data: {
      theme,
      shortName: detail.shortName,
      welcomeTitle: detail.welcomeTitle,
      welcomeBody: detail.welcomeBody,
      serverDate: now.toISOString(),
    },
  });
}
