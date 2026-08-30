"use client";

import { tokens } from "@/lib/tokens";

// Read from the environment rather than importing API_URL from lib/api, which imports
// contexts/AuthContext, which imports this. Same value, no cycle.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const TIMEOUT_MS = 10_000;

/**
 * The name the account currently holds, or null if we could not find out.
 *
 * The copy in localStorage was written by whichever device last signed in here, and the
 * copy in the id token is fixed until that token is reissued, so neither notices a
 * rename made somewhere else. This is the only way to ask.
 *
 * Null on any failure, and the caller keeps what it had: a name is not worth blanking
 * the sidebar over a request that did not come back.
 */
export async function fetchAccountName(): Promise<{ firstName?: string; lastName?: string } | null> {
  const idToken = tokens.getIdToken();
  if (!idToken || !API_URL) return null;

  try {
    const res = await fetch(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${idToken}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) return null;

    const saved = await res.json();
    const firstName = typeof saved?.first_name === "string" ? saved.first_name : "";
    const lastName = typeof saved?.last_name === "string" ? saved.last_name : "";

    // Empty means the account has never saved a profile here, which is not the same as
    // "the name is now blank". Leave those alone so the token's claims still stand.
    if (!firstName && !lastName) return null;

    return {
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
    };
  }
  catch {
    return null;
  }
}
