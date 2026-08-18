"use client";

import { useEffect, useState } from "react";
import { getAnalysis } from "@/lib/api";
import { session } from "@/lib/session";
import { tokens } from "@/lib/tokens";

/**
 * sessionStorage dies with the tab. When it is empty but the user is signed in,
 * pull their last analysis back out of their account before the page decides
 * there is nothing to show.
 */
export function useRestoreAnalysis() {
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (session.hasAnalysis() || !tokens.getIdToken()) {
      setRestored(true);
      return;
    }

    async function restore() {
      try {
        const saved = await getAnalysis();

        if (saved) {
          if (saved.cv_skills?.length) session.setCvSkills(saved.cv_skills);
          if (saved.cv_filename) session.setCvFilename(saved.cv_filename);
          if (saved.target_roles?.length) session.setTargetRoles(saved.target_roles);
          if (saved.gaps) session.setGaps(saved.gaps);
          if (saved.report) session.setReport(saved.report);
        }
      }
      catch {
        // Nothing saved, or the account is unreachable — fall through to the
        // page's own empty state.
      }

      setRestored(true);
    }

    restore();
  }, []);

  return restored;
}
