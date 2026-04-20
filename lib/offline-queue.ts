import { getApiJsonHeaders } from "@/lib/api-client-headers";
import { appConfig } from "@/lib/config";

const STORAGE_KEY = "sat-voca-offline-ops-v1";

export type OfflineOperation = {
  clientOpId: string;
  opType: "study_mark";
  occurredAt: string;
  payload: {
    lemma: string;
    status: "remembered" | "forgotten";
    occurredAtIso: string;
  };
};

function readQueue(): OfflineOperation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as OfflineOperation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(ops: OfflineOperation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
}

export function getOfflineQueueLength(): number {
  return readQueue().length;
}

export function enqueueOfflineStudyMark(input: {
  householdCode: string;
  learnerId: string;
  lemma: string;
  status: "remembered" | "forgotten";
  occurredAtIso: string;
}) {
  if (typeof window === "undefined") return;
  const ops = readQueue();
  if (ops.length >= appConfig.offlineQueueCap) {
    return;
  }
  const op: OfflineOperation = {
    clientOpId: `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    opType: "study_mark",
    occurredAt: input.occurredAtIso,
    payload: {
      lemma: input.lemma,
      status: input.status,
      occurredAtIso: input.occurredAtIso,
    },
  };
  ops.push(op);
  writeQueue(ops);
}

export function clearOfflineQueue() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function flushOfflineQueue(householdCode: string, learnerId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) return;
  const ops = readQueue();
  if (ops.length === 0) return;
  try {
    const response = await fetch("/api/sync/offline-replay", {
      method: "POST",
      headers: getApiJsonHeaders(),
      body: JSON.stringify({ householdCode, learnerId, operations: ops }),
    });
    if (!response.ok) return;
    const json = (await response.json()) as { ok?: boolean };
    if (json.ok) clearOfflineQueue();
  } catch {
    /* still offline or server down */
  }
}
