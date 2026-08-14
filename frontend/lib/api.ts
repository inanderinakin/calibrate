import { tokens } from "@/lib/tokens";
import { refreshIdToken } from "@/lib/hostedUi";

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

  const res = await fetch(`${API_URL}/upload_cv`, {
    method: "POST",
    body,
  });

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
  const loginResponse = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email,
      password: password,
    }),
  });

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

  if (typeof window !== "undefined") {
    window.location.assign("/login");
  }

  throw new Error("Your session has expired. Please sign in again.");
}

async function authedFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: authHeaders() });

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

  return await fetch(`${API_URL}${path}`, { ...init, headers: authHeaders() });
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
  const res = await fetch(`${API_URL}/sign_up`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    }),
  });

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Sign up failed"));
  }

  return await res.json();
}

export async function post_verify_email(email: string, code: string) {
  const res = await fetch(`${API_URL}/verify_email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Confirmation failed"));
  }

  return await res.json();
}
