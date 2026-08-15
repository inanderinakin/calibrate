"use client";

import { getAnalysis } from "@/lib/api";
import { session } from "@/lib/session";
import { tokens } from "@/lib/tokens";

/**
 * Where a signed-in user should land. Pulls their saved analysis down first if
 * this tab has none, so returning after closing the tab picks up where they
 * left off instead of starting at the upload step again.
 */
export async function resolveEntryPath(): Promise<string> {
  if (!tokens.getIdToken()) return "/upload_cv";

  if (!session.hasAnalysis()) {
    try {
      const saved = await getAnalysis();

      if (saved) {
        if (saved.cv_skills?.length) session.setCvSkills(saved.cv_skills);
        if (saved.target_roles?.length) session.setTargetRoles(saved.target_roles);
        if (saved.gaps) session.setGaps(saved.gaps);
        if (saved.report) session.setReport(saved.report);
      }
    }
    catch {
      return "/upload_cv";
    }
  }

  if (session.getGaps()) return "/dashboard";
  if ((session.getCvSkills() ?? []).length > 0) return "/select_role";

  return "/upload_cv";
}
