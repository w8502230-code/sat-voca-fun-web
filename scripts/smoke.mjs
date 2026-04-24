#!/usr/bin/env node
/**
 * Quick smoke: core pages + study mark + review + quiz APIs.
 *
 * Usage:
 *   npm run smoke
 *   SMOKE_BASE_URL=https://your-app.vercel.app npm run smoke
 *
 * Production writes need the same secret the server expects:
 *   SMOKE_APP_SECRET=... SMOKE_BASE_URL=https://... npm run smoke
 *
 * Optional overrides:
 *   SMOKE_HOUSEHOLD_CODE  (default Luna0208)
 *   SMOKE_LEARNER_ID      (default luna)
 */

const base = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const householdCode = process.env.SMOKE_HOUSEHOLD_CODE || "Luna0208";
const learnerId = process.env.SMOKE_LEARNER_ID || "luna";
const appSecret = process.env.SMOKE_APP_SECRET || "";

const failures = [];

function jsonHeaders() {
  /** @type {Record<string, string>} */
  const h = { "Content-Type": "application/json" };
  if (appSecret) h["x-app-secret"] = appSecret;
  return h;
}

/**
 * @param {string} name
 * @param {() => Promise<void>} fn
 */
async function check(name, fn) {
  process.stdout.write(`- ${name} ... `);
  try {
    await fn();
    console.log("ok");
  } catch (e) {
    console.log("FAIL");
    failures.push({ name, error: e instanceof Error ? e.message : String(e) });
  }
}

/**
 * @param {string} method
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function expectStatus(method, path, init, expected = 200) {
  const res = await fetch(`${base}${path}`, { method, ...init });
  if (res.status !== expected) {
    const body = await res.text();
    throw new Error(`${method} ${path} -> ${res.status} ${body.slice(0, 240)}`);
  }
}

/**
 * @param {string} path
 */
async function expectJsonOk(path) {
  const res = await fetch(`${base}${path}`);
  const body = await res.text();
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error(`${path} -> non-JSON (${res.status}): ${body.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status} ${body.slice(0, 240)}`);
  }
  if (!json.ok) {
    throw new Error(`${path} -> ok=false ${JSON.stringify(json.error ?? json).slice(0, 240)}`);
  }
  return json;
}

async function main() {
  console.log(`Smoke base: ${base}`);
  if (!appSecret) {
    console.log("(SMOKE_APP_SECRET unset — fine for local dev; production may require it.)");
  }

  await check("GET /", () => expectStatus("GET", "/"));
  await check("GET /study", () => expectStatus("GET", "/study"));
  await check("GET /result", () => expectStatus("GET", "/result"));
  await check("GET /review", () => expectStatus("GET", "/review"));
  await check("GET /quiz (wrong)", () => expectStatus("GET", "/quiz?scope=wrong"));
  await check("GET /ops", () => expectStatus("GET", "/ops"));

  await check("GET /api/theme/current", async () => {
    await expectJsonOk("/api/theme/current");
  });

  await check("GET /api/daily-plan", async () => {
    await expectJsonOk(`/api/daily-plan?householdCode=${encodeURIComponent(householdCode)}`);
  });

  await check("GET /api/progress/summary", async () => {
    const q = new URLSearchParams({ householdCode, learnerId });
    await expectJsonOk(`/api/progress/summary?${q}`);
  });

  await check("GET /api/review/due", async () => {
    const q = new URLSearchParams({ householdCode, learnerId });
    const json = await expectJsonOk(`/api/review/due?${q}`);
    if (typeof json.data?.dueCount !== "number") {
      throw new Error("review/due missing data.dueCount");
    }
  });

  await check("GET /api/quiz (wrong)", async () => {
    const q = new URLSearchParams({
      householdCode,
      learnerId,
      scope: "wrong",
    });
    await expectJsonOk(`/api/quiz?${q}`);
  });

  await check("POST /api/study/mark", async () => {
    const plan = await expectJsonOk(
      `/api/daily-plan?householdCode=${encodeURIComponent(householdCode)}`,
    );
    const lemma = plan.data?.words?.[0]?.lemma;
    if (!lemma) {
      throw new Error("daily-plan returned no words[0].lemma");
    }
    const res = await fetch(`${base}/api/study/mark`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        householdCode,
        learnerId,
        lemma,
        status: "remembered",
        occurredAt: new Date().toISOString(),
      }),
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`mark -> non-JSON (${res.status}): ${text.slice(0, 200)}`);
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `mark -> ${res.status} ${json.error || text}. Set SMOKE_APP_SECRET to match server APP_SECRET.`,
      );
    }
    if (!res.ok || !json.ok) {
      throw new Error(`mark -> ${res.status} ${text.slice(0, 240)}`);
    }
  });

  if (failures.length) {
    console.error("\nFailures:");
    for (const f of failures) {
      console.error(`  ${f.name}: ${f.error}`);
    }
    if (failures.every((f) => /fetch failed|ECONNREFUSED/i.test(f.error))) {
      console.error(
        "\nHint: start the app first (`npm run dev` or `npm run start`) or set SMOKE_BASE_URL to a running host.",
      );
    }
    process.exit(1);
  }
  console.log("\nAll smoke checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
