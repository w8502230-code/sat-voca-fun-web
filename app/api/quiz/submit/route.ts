import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { validateAppSecret, validateHouseholdCode } from "@/lib/auth";
import { submitQuizSession, submitQuizStateless } from "@/lib/progress-store";

const answerItemSchema = z
  .object({
    questionId: z.string().min(1),
    lemma: z.string().min(1),
    selectedOption: z.string().min(1),
    kind: z.union([z.literal("cloze"), z.literal("tf")]),
    tfStatement: z.string().optional(),
  })
  .refine((data) => data.kind !== "tf" || (data.tfStatement !== undefined && data.tfStatement.length > 0), {
    message: "tfStatement is required when kind is tf",
  });

const submitSchema = z.object({
  householdCode: z.string().min(1),
  learnerId: z.string().min(1),
  scope: z.union([z.literal("batch"), z.literal("daily"), z.literal("wrong")]),
  sessionId: z.string().min(1),
  answers: z.array(answerItemSchema),
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

  const parsed = submitSchema.safeParse(body);
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

  const result = submitQuizSession(
    parsed.data.householdCode,
    parsed.data.learnerId,
    parsed.data.sessionId,
    parsed.data.answers,
  );
  if (!result.ok && result.reason.startsWith("Session expired")) {
    const recovered = submitQuizStateless(
      parsed.data.householdCode,
      parsed.data.learnerId,
      parsed.data.scope,
      parsed.data.answers,
    );
    return NextResponse.json({
      ok: true,
      data: recovered,
      recoveredFromExpiredSession: true,
    });
  }
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data: result.data });
}
