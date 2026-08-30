import type { Language } from "@/contexts/LanguageContext";
import type { GapResult, NormalizedSkill, Report } from "./types";
// Type only, so no runtime cycle with lib/api, which imports this module.
import type { SavedAnalysis } from "@/lib/api";

const KEYS = {
  cvSkills: "calibrate:cv_skills",
  cvFilename: "calibrate:cv_filename",
  cvSize: "calibrate:cv_size",
  cvType: "calibrate:cv_type",
  cvUploadedAt: "calibrate:cv_uploaded_at",
  targetRoles: "calibrate:target_roles",
  gaps: "calibrate:gaps",
  report: "calibrate:report",
  reportLanguage: "calibrate:report_language",
  focusSkills: "calibrate:focus_skills",
} as const;

/** The keys persistSession uploads, so the ones the account is authoritative for. */
const ACCOUNT_OWNED = [
  KEYS.cvSkills,
  KEYS.cvFilename,
  KEYS.cvSize,
  KEYS.cvType,
  KEYS.cvUploadedAt,
  KEYS.targetRoles,
  KEYS.gaps,
  KEYS.report,
  KEYS.reportLanguage,
] as const;

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } 
  catch {
    window.sessionStorage.removeItem(key);
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

export const session = {
  getCvSkills: () => read<NormalizedSkill[]>(KEYS.cvSkills),
  setCvSkills: (skills: NormalizedSkill[]) => write(KEYS.cvSkills, skills),

  getCvFilename: () => read<string>(KEYS.cvFilename),
  setCvFilename: (name: string) => write(KEYS.cvFilename, name),

  getCvSize: () => read<number>(KEYS.cvSize),
  setCvSize: (bytes: number) => write(KEYS.cvSize, bytes),

  getCvType: () => read<string>(KEYS.cvType),
  setCvType: (type: string) => write(KEYS.cvType, type),

  getCvUploadedAt: () => read<string>(KEYS.cvUploadedAt),
  setCvUploadedAt: (iso: string) => write(KEYS.cvUploadedAt, iso),

  getTargetRoles: () => read<string[]>(KEYS.targetRoles),
  setTargetRoles: (roles: string[]) => write(KEYS.targetRoles, roles),

  getGaps: () => read<GapResult>(KEYS.gaps),
  setGaps: (gaps: GapResult) => write(KEYS.gaps, gaps),

  getReport: () => read<Report>(KEYS.report),
  setReport: (report: Report) => write(KEYS.report, report),

  getReportLanguage: () => read<Language>(KEYS.reportLanguage),
  setReportLanguage: (language: Language) => write(KEYS.reportLanguage, language),

  getFocusSkills: () => read<string[]>(KEYS.focusSkills),
  setFocusSkills: (skills: string[]) => write(KEYS.focusSkills, skills),

  clearDerived: () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(KEYS.gaps);
    window.sessionStorage.removeItem(KEYS.report);
    window.sessionStorage.removeItem(KEYS.reportLanguage);
    window.sessionStorage.removeItem(KEYS.focusSkills);
  },

  hasAnalysis: () =>
    read<NormalizedSkill[]>(KEYS.cvSkills) !== null || read<Report>(KEYS.report) !== null,

  clear: () => {
    if (typeof window === "undefined") return;
    for (const key of Object.values(KEYS)) window.sessionStorage.removeItem(key);
  },

  /**
   * Replace what the account owns with what it holds, clearing what it no longer has,
   * which is what makes a deletion on another device land. focusSkills is left alone:
   * it is this tab's own state and persistSession never sends it.
   */
  applyAccountCopy: (saved: SavedAnalysis | null) => {
    if (typeof window === "undefined") return;

    for (const key of ACCOUNT_OWNED) window.sessionStorage.removeItem(key);

    if (!saved) return;

    if (saved.cv_skills?.length) write(KEYS.cvSkills, saved.cv_skills);
    if (saved.cv_filename) write(KEYS.cvFilename, saved.cv_filename);
    if (saved.cv_size) write(KEYS.cvSize, saved.cv_size);
    if (saved.cv_type) write(KEYS.cvType, saved.cv_type);
    if (saved.cv_uploaded_at) write(KEYS.cvUploadedAt, saved.cv_uploaded_at);
    if (saved.target_roles?.length) write(KEYS.targetRoles, saved.target_roles);
    if (saved.gaps) write(KEYS.gaps, saved.gaps);
    if (saved.report) write(KEYS.report, saved.report);
    if (saved.report_language) write(KEYS.reportLanguage, saved.report_language);
  },
};
