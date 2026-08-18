import { tokens } from "@/lib/tokens";
import { refreshIdToken } from "@/lib/hostedUi";
import { clearStoredUser } from "@/contexts/AuthContext";
import type { GapResult, NormalizedSkill, PostingsPayload, ProjectStep, Report } from "@/lib/types";
import { session } from "@/lib/session";

export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function errorMessage(
  res: Response,
  fallback: string
): Promise<string> {
  const body = await res.json().catch(() => null);
  const detail = body?.detail;

  if (typeof detail === "string") return detail;
  if (detail && typeof detail.message === "string") return detail.message;

  return `${fallback} (${res.status})`;
}

const UPLOAD_TIMEOUT_MS = 120_000;
const AUTH_TIMEOUT_MS = 30_000;
// The brief agent calls a tool per skill before writing, so this is slower than the rest.
const BRIEFS_TIMEOUT_MS = 200_000;

export function fetchWithTimeout(path: string, init: RequestInit, ms: number) {
  return fetch(`${API_URL}${path}`, { ...init, signal: AbortSignal.timeout(ms) });
}

export function isTimeout(e: unknown) {
  return e instanceof DOMException && e.name === "TimeoutError";
}

/**
 * Upload a CV to the backend.
 *
 * Backend endpoint:
 * POST /upload_cv
 *
 * The CV is sent as multipart/form-data
 * with the field name "file".
 */
export async function uploadCv(file: File) {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  const body = new FormData();
  body.append("file", file);

  const res = await fetchWithTimeout("/upload_cv", {
    method: "POST",
    body,
  }, UPLOAD_TIMEOUT_MS);

  if (!res.ok) {
    throw new Error(await errorMessage(res, "CV upload failed"));
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

export async function post_login(email: string, password: string) {
  const loginResponse = await fetchWithTimeout("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email,
      password: password,
    }),
  }, AUTH_TIMEOUT_MS);

  if (!loginResponse.ok ) {
    throw new Error(await errorMessage(loginResponse, "Login failure"))
  }
  return await loginResponse.json()
}

function authHeaders() {
  const idToken = tokens.getIdToken();

  if (!idToken) {
    throw new Error("You are not signed in.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };
}

function endSession(): never {
  tokens.clear();
  clearStoredUser();

  if (typeof window !== "undefined") {
    window.location.assign("/login");
  }

  throw new Error("Your session has expired. Please sign in again.");
}

async function authedFetch(path: string, init: RequestInit = {}) {
  const res = await fetchWithTimeout(path, { ...init, headers: authHeaders() }, AUTH_TIMEOUT_MS);

  if (res.status !== 401) return res;

  const refreshToken = tokens.getRefreshToken();

  if (!refreshToken) endSession();

  try {
    const refreshed = await refreshIdToken(refreshToken);
    tokens.setIdToken(refreshed.id_token);
  }
  catch {
    endSession();
  }

  return await fetchWithTimeout(path, { ...init, headers: authHeaders() }, AUTH_TIMEOUT_MS);
}

export async function updateProfile(firstName: string, lastName: string) {
  const res = await authedFetch("/profile", {
    method: "POST",
    body: JSON.stringify({ first_name: firstName, last_name: lastName }),
  });

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not save your name"));
  }

  return await res.json();
}

export async function deleteAccount() {
  const res = await authedFetch("/account", { method: "DELETE" });

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not delete your account"));
  }

  return await res.json();
}

export async function getCompletedSkills(): Promise<string[]> {
  const res = await authedFetch("/completed_skills");

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not load your progress"));
  }

  const data = await res.json();
  return data.completed_skills;
}

export async function setCompletedSkills(skills: string[]): Promise<string[]> {
  const res = await authedFetch("/completed_skills", {
    method: "POST",
    body: JSON.stringify({ skills }),
  });

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not save your progress"));
  }

  const data = await res.json();
  return data.completed_skills;
}

export async function post_signup(
  email: string,
  password: string,
  firstName: string,
  lastName: string
) {
  const res = await fetchWithTimeout("/sign_up", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    }),
  }, AUTH_TIMEOUT_MS);

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Sign up failed"));
  }

  return await res.json();
}

export async function post_resend_code(email: string) {
  const res = await fetchWithTimeout("/resend_code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }, AUTH_TIMEOUT_MS);

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not send a new code"));
  }

  return await res.json();
}

export async function post_verify_email(email: string, code: string) {
  const res = await fetchWithTimeout("/verify_email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  }, AUTH_TIMEOUT_MS);

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Confirmation failed"));
  }

  return await res.json();
}

export interface SavedAnalysis {
  cv_skills: NormalizedSkill[];
  target_roles: string[];
  gaps: GapResult | null;
  report: Report | null;
  cv_filename: string | null;
}

export async function getAnalysis(): Promise<SavedAnalysis | null> {
  const res = await authedFetch("/analysis");

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not load your saved analysis"));
  }

  const data = await res.json();
  return data.analysis ?? null;
}

export async function saveAnalysis(analysis: SavedAnalysis) {
  const res = await authedFetch("/analysis", {
    method: "POST",
    body: JSON.stringify(analysis),
  });

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not save your analysis"));
  }

  return await res.json();
}

/**
 * Push whatever the session currently holds up to the account. Safe to call
 * after any step of the flow — signed-out users are a no-op.
 */
export async function persistSession() {
  if (!tokens.getIdToken()) return;

  await saveAnalysis({
    cv_skills: session.getCvSkills() ?? [],
    target_roles: session.getTargetRoles() ?? [],
    gaps: session.getGaps(),
    report: session.getReport(),
    cv_filename: session.getCvFilename(),
  });
}

/**
 * Fetch market trends safely.
 * Checks res.ok before attempting to parse JSON to avoid unhandled exceptions on non-200 responses.
 */
export async function getTrends() {
  const res = await fetch(`${API_URL}/trends`);

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not fetch trends data"));
  }

  return await res.json();
}

export interface PostingFilters {
  role?: string;
  city?: string;
  workModel?: string;
  skill?: string;
  mySkills?: string[];
  search?: string;
  sort?: "newest" | "closing";
  page?: number;
  pageSize?: number;
}

export async function getPostings(filters: PostingFilters = {}): Promise<PostingsPayload> {
  const params = new URLSearchParams();

  if (filters.role) params.set("role", filters.role);
  if (filters.city) params.set("city", filters.city);
  if (filters.workModel) params.set("work_model", filters.workModel);
  if (filters.skill) params.set("skill", filters.skill);
  if (filters.mySkills?.length) params.set("my_skills", filters.mySkills.join(","));
  if (filters.search) params.set("search", filters.search);
  if (filters.sort) params.set("sort", filters.sort);
  params.set("page", String(filters.page ?? 1));
  params.set("page_size", String(filters.pageSize ?? 20));

  const res = await fetchWithTimeout(`/postings?${params.toString()}`, {}, AUTH_TIMEOUT_MS);

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not load the job postings"));
  }

  return await res.json();
}

export async function getSkillCatalog(): Promise<NormalizedSkill[]> {
  const res = await fetch(`${API_URL}/skills`);

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not load the skill list"));
  }

  return (await res.json()).skills;
}

export async function getCvBullet(step: ProjectStep, notes: string, language: string): Promise<string> {
  const res = await fetchWithTimeout("/cv_bullet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step, notes, language }),
  }, BRIEFS_TIMEOUT_MS);

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not write the CV line"));
  }

  return (await res.json()).bullet;
}

export async function getCompletedProjects(): Promise<string[]> {
  const res = await authedFetch("/completed_projects");

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not load your project progress"));
  }

  return (await res.json()).completed_projects;
}

export async function setCompletedProjects(skills: string[]): Promise<string[]> {
  const res = await authedFetch("/completed_projects", {
    method: "POST",
    body: JSON.stringify({ skills }),
  });

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Could not save your project progress"));
  }

  return (await res.json()).completed_projects;
}
