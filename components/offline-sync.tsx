"use client";

import { useEffect } from "react";

import { flushOfflineQueue } from "@/lib/offline-queue";

type Props = {
  householdCode: string;
  learnerId: string;
};

export function OfflineSync({ householdCode, learnerId }: Props) {
  useEffect(() => {
    const run = () => void flushOfflineQueue(householdCode, learnerId);
    void run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, [householdCode, learnerId]);

  return null;
}
