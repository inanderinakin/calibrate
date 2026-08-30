"use client";

import { tokens } from "@/lib/tokens";
import { refreshIdToken } from "@/lib/hostedUi";

// Read from the environment rather than importing API_URL from lib/api, which imports
// contexts/AuthContext, which imports this.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const CHECK_TIMEOUT_MS = 10_000;

/** "unknown" leaves the session alone, so a network failure never signs anyone out. */
export type SessionState = "live" | "dead" | "unknown";

function ask(idToken: string) {
  return fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${idToken}` },
    signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
  });
}

export async function checkSession(): Promise<SessionState> {
  const idToken = tokens.getIdToken();
  if (!idToken) return "dead";
  if (!API_URL) return "unknown";

  let res: Response;
  try {
    res = await ask(idToken);
  }
  catch {
    return "unknown";
  }

  if (res.status !== 401) return res.ok ? "live" : "unknown";

  // Could just be an aged-out token, so spend the refresh once to tell that apart
  // from an account that is gone.
  const refreshToken = tokens.getRefreshToken();
  if (!refreshToken) return "dead";

  let refreshedIdToken: string;
  try {
    refreshedIdToken = (await refreshIdToken(refreshToken)).id_token;
  }
  catch {
    return "dead";
  }

  tokens.setIdToken(refreshedIdToken);

  try {
    const retry = await ask(refreshedIdToken);
    if (retry.status === 401) return "dead";
    return retry.ok ? "live" : "unknown";
  }
  catch {
    return "unknown";
  }
}

/** Anything not listed here needs a session, so a new page fails closed. */
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/terms",
  "/kvkk",
  "/contact",
  "/forgot_password",
  "/reset_password",
  "/verify_email",
  "/account_created",
  "/auth/callback",
]);

export function isPublicPath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  return PUBLIC_PATHS.has(path);
}
