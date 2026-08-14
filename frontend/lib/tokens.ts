const KEYS = {
  idToken: "calibrate:id_token",
  refreshToken: "calibrate:refresh_token",
} as const;

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

export interface IdTokenClaims {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
}

export function readClaims(idToken: string): IdTokenClaims | null {
  const payload = idToken.split(".")[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const bytes = atob(padded);
    const utf8 = decodeURIComponent(
      bytes
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );

    return JSON.parse(utf8) as IdTokenClaims;
  }
  catch {
    return null;
  }
}

export const tokens = {
  getIdToken: () => read(KEYS.idToken),
  getRefreshToken: () => read(KEYS.refreshToken),

  set: (idToken: string, refreshToken: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEYS.idToken, idToken);
    window.localStorage.setItem(KEYS.refreshToken, refreshToken);
  },

  clear: () => {
    if (typeof window === "undefined") return;
    for (const key of Object.values(KEYS)) window.localStorage.removeItem(key);
  },
};
