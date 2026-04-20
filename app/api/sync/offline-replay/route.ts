import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { validateAppSecret, validateHouseholdCode } from "@/lib/auth";
import { appConfig } from "@/lib/config";
import { applyStudyMark } from "@/lib/progress-store";

const operationSchema = z.object({
  clientOpId: z.string().min(1),
  opType: z.string().min(1),
  occurredAt: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()),
});

const replaySchema = z.object({
  householdCode: z.string().min(1),
  learnerId: z.string().min(1),
  operations: z.array(operationSchema).max(appConfig.offlineQueueCap),
});

const studyMarkPayloadSchema = z.object({
  lemma: z.string().min(1),
  status: z.enum(["remembered", "forgotten"]),
  occurredAtIso: z.string().datetime(),
});

type GlobalWithReplay = typeof globalThis & {
  __satVocaReplayedOpIds?: Set<string>;
};

const replayedOpIds = (): Set<string> => {
  const g = globalThis as GlobalWithReplay;
  if (!g.__satVocaReplayedOpIds) g.__satVocaReplayedOpIds = new Set();
  return g.__satVocaReplayedOpIds;
};

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

  const parsed = replaySchema.safeParse(body);
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

  const sortedOps = [...parsed.data.operations].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  const ids = replayedOpIds();
  let applied = 0;
  let skippedDuplicate = 0;
  let skippedUnknown = 0;

  for (const op of sortedOps) {
    if (ids.has(op.clientOpId)) {
      skippedDuplicate += 1;
      continue;
    }
    if (op.opType === "study_mark") {
      const payload = studyMarkPayloadSchema.safeParse(op.payload);
      if (!payload.success) {
        return NextResponse.json(
          { ok: false, error: "Invalid study_mark payload", details: payload.error.flatten() },
          { status: 400 },
        );
      }
      applyStudyMark({
        householdCode: parsed.data.householdCode,
        learnerId: parsed.data.learnerId,
        lemma: payload.data.lemma,
        status: payload.data.status,
        occurredAtIso: payload.data.occurredAtIso,
      });
      ids.add(op.clientOpId);
      applied += 1;
    } else {
      skippedUnknown += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      learnerId: parsed.data.learnerId,
      appliedCount: applied,
      skippedDuplicateCount: skippedDuplicate,
      skippedUnknownOpTypeCount: skippedUnknown,
      replayOrder: "chronological",
      queueCap: appConfig.offlineQueueCap,
      maxOfflineDays: appConfig.maxOfflineDays,
    },
  });
}
