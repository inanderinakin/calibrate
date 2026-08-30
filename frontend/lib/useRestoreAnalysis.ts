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

/**
 * Reconcile this tab's copy of the analysis with the account's.
 *
 * sessionStorage survives a refresh, so this used to return early whenever the tab
 * already held something and never asked the account at all. That is what left a CV
 * removed on one device still sitting on another: the account was updated, this tab
 * simply never looked. Now it always asks, and the account wins.
 *
 * The return value is a revision, not a flag. Zero means there is nothing worth
 * painting yet, so `if (!restored) return` still reads correctly, and it changes again
 * once the account has answered, which re-runs the callers' effects against the
 * corrected data. Painting from the local copy first keeps the fast first paint;
 * blocking every load on a round trip would put a skeleton on all of these pages.
 */
let reconciledThisLoad = false;

export function useRestoreAnalysis() {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    // Once per page load is enough. Moving between the app's pages is client-side, so
    // this module stays alive and every tab switch would otherwise re-ask for the same
    // answer. A refresh, which is what someone does when they expect to see a change
    // made on another device, gets a fresh module and asks again.
    if (reconciledThisLoad) {
      setRevision((r) => r || 1);
      return;
    }

    // Show what this tab already has straight away, before asking anyone.
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
        // The account is unreachable. Keep whatever this tab already had and leave the
        // marker alone: a failed request is not evidence that the account is empty.
        if (!cancelled) setRevision((r) => r || 1);
        return;
      }

      if (cancelled) return;

      // Only now, so a failed request is retried on the next navigation rather than
      // leaving the tab stale for as long as it stays open.
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
