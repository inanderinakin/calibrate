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