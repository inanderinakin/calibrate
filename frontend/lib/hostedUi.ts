const DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
const CLIENT_ID = process.env.NEXT_PUBLIC_APP_CLIENT_ID;

export const CALLBACK_PATH = "/auth/callback";

function redirectUri() {
  return `${window.location.origin}${CALLBACK_PATH}`;
}

export function signInWith(provider: "Google") {
  if (!DOMAIN || !CLIENT_ID) {
    throw new Error("Cognito hosted UI is not configured.");
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: redirectUri(),
    identity_provider: provider,
  });

  window.location.assign(`${DOMAIN}/oauth2/authorize?${params}`);
}

export async function exchangeCodeForTokens(code: string) {
  if (!DOMAIN || !CLIENT_ID) {
    throw new Error("Cognito hosted UI is not configured.");
  }

  const res = await fetch(`${DOMAIN}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
      redirect_uri: redirectUri(),
    }),
  });

  if (!res.ok) {
    throw new Error("We could not complete that sign in.");
  }

  return (await res.json()) as { id_token: string; refresh_token: string };
}
