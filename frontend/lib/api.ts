export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  const detail = body?.detail;

  if (typeof detail === "string") return detail;
  if (detail && typeof detail.message === "string") return detail.message;

  return `${fallback} (${res.status})`;
}
