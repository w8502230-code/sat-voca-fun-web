import { appConfig } from "@/lib/config";

type ValidationResult = { ok: true } | { ok: false; message: string; status: number };

export const validateHouseholdCode = (householdCode?: string | null): ValidationResult => {
  if (!householdCode) {
    return { ok: false, message: "householdCode is required", status: 400 };
  }

  if (householdCode !== appConfig.householdCode) {
    return { ok: false, message: "Invalid household code", status: 403 };
  }

  return { ok: true };
};

export const validateAppSecret = (appSecret?: string | null): ValidationResult => {
  if (process.env.NODE_ENV !== "production") {
    return { ok: true };
  }

  if (!appSecret) {
    return { ok: false, message: "x-app-secret is required", status: 401 };
  }

  if (appSecret !== appConfig.appSecret) {
    return { ok: false, message: "Invalid app secret", status: 403 };
  }

  return { ok: true };
};
