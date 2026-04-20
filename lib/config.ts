const requiredEnv = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
};

export const appConfig = {
  householdCode: requiredEnv("HOUSEHOLD_CODE", "Luna0208"),
  learnerId: requiredEnv("LEARNER_ID", "luna"),
  appSecret: requiredEnv("APP_SECRET", "dev-only-secret"),
  rotationStartDate: requiredEnv("ROTATION_START_DATE", "2026-04-14"),
  serverTimezone: requiredEnv("SERVER_TIMEZONE", "UTC"),
  offlineQueueCap: 2000,
  maxOfflineDays: 10,
} as const;
