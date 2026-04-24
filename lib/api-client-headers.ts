/** Headers for browser `fetch` to Route Handlers. Production writes require `x-app-secret`. */
export function getApiJsonHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const secret = process.env.NEXT_PUBLIC_APP_SECRET;
  if (secret) {
    headers["x-app-secret"] = secret;
  }
  return headers;
}

/** Safe string for `setState` from Route Handler `{ error: string | object }` bodies. */
export function formatClientApiError(error: unknown, fallback: string): string {
  if (error == null) return fallback;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return fallback;
  }
}
