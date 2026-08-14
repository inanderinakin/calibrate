"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";
import { exchangeCodeForTokens } from "@/lib/hostedUi";
import { tokens, readClaims } from "@/lib/tokens";

function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const { language } = useLanguage();
  const t = getTranslations(language);
  const started = useRef(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = params.get("code");
    const denied = params.get("error_description") ?? params.get("error");

    if (denied) {
      setError(denied);
      return;
    }

    if (!code) {
      setError(t.login.genericError);
      return;
    }

    async function run() {
      try {
        const result = await exchangeCodeForTokens(code!);
        tokens.set(result.id_token, result.refresh_token);

        const claims = readClaims(result.id_token);

        login({
          email: claims?.email ?? "",
          firstName: claims?.given_name ?? "",
          lastName: claims?.family_name ?? "",
          studyField: "",
        });

        router.replace("/upload_cv");
      }
      catch (err) {
        setError(err instanceof Error ? err.message : t.login.genericError);
      }
    }

    run();
  }, [params, login, router, t]);

  if (error) {
    return (
      <div className="glass-card w-full max-w-md flex flex-col gap-4 rounded-[24px] p-8">
        <p role="alert" className="font-medium text-[var(--text-primary)]">
          {error}
        </p>

        <Link
          href="/login"
          className="rounded-lg bg-[var(--accent-bg)] text-[var(--accent-text)] py-2.5 text-center font-medium"
        >
          {t.login.submit}
        </Link>
      </div>
    );
  }

  return (
    <div
      role="progressbar"
      aria-label={t.login.title}
      className="h-3 w-full max-w-md overflow-hidden rounded-full bg-[var(--accent-bg)]/20"
    >
      <div className="h-full w-1/3 rounded-full bg-(--accent-bg) animate-indeterminate" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--page-bg)] p-6">
      <Suspense>
        <Callback />
      </Suspense>
    </main>
  );
}
