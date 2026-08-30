"use client";

import { useEffect, useState } from "react";
import { getAnalysis } from "@/lib/api";
import { session } from "@/lib/session";
import { readClaims, tokens } from "@/lib/tokens";

/**
 * sessionStorage dies with the tab, so hasAnalysis() cannot tell a returning user
 * from a brand new one until the restore below answers. This marker outlives the tab
 * and records what the account actually turned out to hold. It is keyed by the
 * account, so a second user on the same browser never reads the first one's answer.
 */
function markerKey(): string | null {
  const idToken = tokens.getIdToken();
  const sub = idToken ? readClaims(idToken)?.sub : null;
  return sub ? `calibrate:has_analysis:${sub}` : null;
}

function readMarker(): boolean | null {
  if (typeof window === "undefined") return null;

  const key = markerKey();
  if (!key) return null;

  const raw = window.localStorage.getItem(key);
  return raw === "1" ? true : raw === "0" ? false : null;
}

function writeMarker(value: boolean): void {
  if (typeof window === "undefined") return;

  const key = markerKey();
  if (key) window.localStorage.setItem(key, value ? "1" : "0");
}

/**
 * Whether the page has any reason to expect an analysis, answered synchronously so a
 * caller can pick the right first paint instead of showing a skeleton it will have to
 * throw away. Signed out there is nothing to restore. Signed in, the marker says what
 * the account held last time; without one we assume there is, which is the right guess
 * for an account that has used the app at all.
 */
export function clearAnalysisMarker(): void {
  if (typeof window === "undefined") return;

  const key = markerKey();
  if (key) window.localStorage.removeItem(key);
}

export function expectsAnalysis() {
  if (session.hasAnalysis()) return true;
  if (!tokens.getIdToken()) return false;

  return readMarker() ?? true;
}

let reconciledThisLoad = false;

/**
 * Reconcile this tab's copy of the analysis with the account's, which wins.
 *
 * Returns a revision, not a flag: 0 means nothing to paint yet, and it changes again
 * once the account has answered so callers re-run against the corrected data.
 */
export function useRestoreAnalysis() {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    // Once per page load; client-side navigation keeps this module alive.
    if (reconciledThisLoad) {
      setRevision((r) => r || 1);
      return;
    }

    // Paint what this tab already has before asking anyone.
    if (session.hasAnalysis()) {
      writeMarker(true);
      setRevision(1);
    }

    if (!tokens.getIdToken()) {
      setRevision((r) => r || 1);
      return;
    }

    let cancelled = false;

    async function reconcile() {
      let saved;

      try {
        saved = await getAnalysis();
      }
      catch {
        // A failed request is not evidence the account is empty, so keep what we had.
        if (!cancelled) setRevision((r) => r || 1);
        return;
      }

      if (cancelled) return;

      reconciledThisLoad = true;

      session.applyAccountCopy(saved);
      writeMarker(session.hasAnalysis());
      setRevision((r) => r + 1);
    }

    reconcile();

    return () => {
      cancelled = true;
    };
  }, []);

  return revision;
}
