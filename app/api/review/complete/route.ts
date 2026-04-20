import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { validateAppSecret, validateHouseholdCode } from "@/lib/auth";
import { completeReviewTask } from "@/lib/progress-store";

const payloadSchema = z.object({
  householdCode: z.string().min(1),
  learnerId: z.string().min(1),
  lemma: z.string().min(1),
  intervalDays: z.union([z.literal(1), z.literal(3), z.literal(7)]),
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

  const result = completeReviewTask(
    parsed.data.householdCode,
    parsed.data.learnerId,
    parsed.data.lemma,
    parsed.data.intervalDays,
  );
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "No pending review task found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
