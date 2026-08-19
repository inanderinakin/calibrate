import type { GapResult, NormalizedSkill, Report } from "./types";

const KEYS = {
  cvSkills: "calibrate:cv_skills",
  cvFilename: "calibrate:cv_filename",
  cvSize: "calibrate:cv_size",
  cvType: "calibrate:cv_type",
  cvUploadedAt: "calibrate:cv_uploaded_at",
  targetRoles: "calibrate:target_roles",
  gaps: "calibrate:gaps",
  report: "calibrate:report",
  focusSkills: "calibrate:focus_skills",
} as const;

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

  getFocusSkills: () => read<string[]>(KEYS.focusSkills),
  setFocusSkills: (skills: string[]) => write(KEYS.focusSkills, skills),

  clearDerived: () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(KEYS.gaps);
    window.sessionStorage.removeItem(KEYS.report);
    window.sessionStorage.removeItem(KEYS.focusSkills);
  },

  hasAnalysis: () =>
    read<NormalizedSkill[]>(KEYS.cvSkills) !== null || read<Report>(KEYS.report) !== null,

  clear: () => {
    if (typeof window === "undefined") return;
    for (const key of Object.values(KEYS)) window.sessionStorage.removeItem(key);
  },
};
