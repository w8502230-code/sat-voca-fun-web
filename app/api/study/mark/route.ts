import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { validateAppSecret, validateHouseholdCode } from "@/lib/auth";
import { appConfig } from "@/lib/config";
import { applyStudyMark } from "@/lib/progress-store";

const payloadSchema = z.object({
  householdCode: z.string().min(1),
  learnerId: z.string().min(1),
  lemma: z.string().min(1),
  status: z.enum(["remembered", "forgotten"]),
  occurredAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  const appSecret = request.headers.get("x-app-secret");
  const secretCheck = validateAppSecret(appSecret);

  if (!secretCheck.ok) {
    return NextResponse.json(
      { ok: false, error: secretCheck.message },
      { status: secretCheck.status },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const householdCheck = validateHouseholdCode(parsed.data.householdCode);
  if (!householdCheck.ok) {
    return NextResponse.json(
      { ok: false, error: householdCheck.message },
      { status: householdCheck.status },
    );
  }

  // Placeholder until DB persistence lands.
  const occurredAt = parsed.data.occurredAt ?? new Date().toISOString();
  const markResult = applyStudyMark({
    householdCode: parsed.data.householdCode,
    learnerId: parsed.data.learnerId,
    lemma: parsed.data.lemma,
    status: parsed.data.status,
    occurredAtIso: occurredAt,
  });

  return NextResponse.json({
    ok: true,
    data: {
      learnerId: parsed.data.learnerId,
      lemma: markResult.normalizedLemma,
      status: parsed.data.status,
      masteredCountDefinition: "Historical all mastered lemmas deduped by lemma.",
      todayProgress: {
        markedCount: markResult.markedTodayCount,
        targetCount: markResult.dailyTargetCount,
        isDailyCompleted: markResult.isDailyCompleted,
      },
      cumulativeMasteredCount: markResult.cumulativeMasteredCount,
      queueRules: {
        maxOfflineDays: appConfig.maxOfflineDays,
        offlineQueueCap: appConfig.offlineQueueCap,
      },
    },
  });
}
