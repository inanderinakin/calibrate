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
 * sessionStorage dies with the tab. When it is empty but the user is signed in,
 * pull their last analysis back out of their account before the page decides
 * there is nothing to show.
 */
export function useRestoreAnalysis() {
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (session.hasAnalysis()) {
      writeMarker(true);
      setRestored(true);
      return;
    }

    if (!tokens.getIdToken()) {
      setRestored(true);
      return;
    }

    async function restore() {
      try {
        const saved = await getAnalysis();

        if (saved) {
          if (saved.cv_skills?.length) session.setCvSkills(saved.cv_skills);
          if (saved.cv_filename) session.setCvFilename(saved.cv_filename);
          if (saved.cv_size) session.setCvSize(saved.cv_size);
          if (saved.cv_type) session.setCvType(saved.cv_type);
          if (saved.cv_uploaded_at) session.setCvUploadedAt(saved.cv_uploaded_at);
          if (saved.target_roles?.length) session.setTargetRoles(saved.target_roles);
          if (saved.gaps) session.setGaps(saved.gaps);
          if (saved.report) session.setReport(saved.report);
          if (saved.report_language) session.setReportLanguage(saved.report_language);
        }

        // The request answered, so we now know what this account holds.
        writeMarker(session.hasAnalysis());
      }
      catch {
        // The account is unreachable, so fall through to the page's own empty state.
        // The marker is left alone on purpose: a failed request is not evidence that
        // the account has nothing.
      }

      setRestored(true);
    }

    restore();
  }, []);

  return restored;
}
