"use client";

import { tokens } from "@/lib/tokens";

// Read from the environment rather than importing API_URL from lib/api, which imports
// contexts/AuthContext, which imports this.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const TIMEOUT_MS = 10_000;

/**
 * The name the account currently holds, or null if we could not find out. Neither the
 * stored copy nor the id token notices a rename made on another device.
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

    // Never saved here is not the same as "now blank", so let the token's claims stand.
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
