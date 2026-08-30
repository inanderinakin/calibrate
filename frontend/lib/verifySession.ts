"use client";

import { tokens } from "@/lib/tokens";
import { refreshIdToken } from "@/lib/hostedUi";

// Read straight from the environment rather than importing API_URL from lib/api, which
// imports this module's caller back out of contexts/AuthContext. Same value, no cycle.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const CHECK_TIMEOUT_MS = 10_000;

/**
 * "dead" is the only answer that may sign somebody out. A request that never got an
 * answer is "unknown", and the session stands: being briefly offline, or catching the
 * backend during a deploy, must not throw people out of the app.
 */
export type SessionState = "live" | "dead" | "unknown";

function ask(idToken: string) {
  return fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${idToken}` },
    signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
  });
}

/**
 * Ask the backend whether this session still belongs to a live account.
 *
 * A stored id token proves only that somebody signed in here once. It stays verifiable
 * until it expires, so on its own it cannot tell us the account was deleted from another
 * device, which is exactly the case this exists for. /me is the one endpoint that checks
 * the account is still there, so this is the question worth asking on load.
 */
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

  // A 401 here is still ambiguous: the id token may just have aged out. Spend the
  // refresh token once to tell "expired" apart from "this account is gone".
  const refreshToken = tokens.getRefreshToken();
  if (!refreshToken) return "dead";

  let refreshedIdToken: string;
  try {
    refreshedIdToken = (await refreshIdToken(refreshToken)).id_token;
  }
  catch {
    // Cognito refuses to refresh for a user it no longer has.
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

/**
 * Pages anyone may see. Anything not on this list is treated as needing a session, so a
 * page added later fails closed and redirects rather than silently staying open.
 */
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
  // The static export serves /dashboard and /dashboard/ alike, so trim the slash first.
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  return PUBLIC_PATHS.has(path);
}
