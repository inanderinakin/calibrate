"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";
import { isTimeout, post_login } from "@/lib/api";
import { tokens, readClaims } from "@/lib/tokens";
import { resolveEntryPath } from "@/lib/entry";
import BackButton from "@/components/BackButton";
import { Icon } from "@iconify/react";
import { signInWith } from "@/lib/hostedUi";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { language } = useLanguage();
  const t = getTranslations(language);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await post_login(
        email,
        password,
      );
      tokens.set(response.id_token, response.refresh_token);

      const claims = readClaims(response.id_token);

      login({
        email: claims?.email ?? email,
        firstName: claims?.given_name ?? "",
        lastName: claims?.family_name ?? "",
        studyField: "",
        country: "",
      });

      router.replace(await resolveEntryPath());
    }
    catch (e) {
      setError(isTimeout(e) ? t.login.timeoutError : e instanceof Error ? e.message : t.login.genericError);
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--page-bg)] p-6 md:p-10 lg:p-14">
      <div className="mb-6 flex justify-start">
        <BackButton fallbackHref="/" />
      </div>

      <div className="flex flex-1 items-center justify-center">
        <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-card w-full max-w-md flex flex-col gap-4 rounded-[24px] p-8"
      >
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-2xl font-semibold text-[var(--text-primary)]"
        >
          {t.login.title}
        </motion.h1>

        <input
          required
          type="email"
          placeholder={t.login.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="glass-input rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
        />

        <input
          required
          type="password"
          placeholder={t.login.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="glass-input rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
        />

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-[var(--accent-2)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]"
          >
            {error}
          </p>
        )}

        <motion.button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          whileHover={submitting ? undefined : { scale: 1.02 }}
          whileTap={submitting ? undefined : { scale: 0.97 }}
          className="flex items-center justify-center rounded-lg bg-[var(--accent-bg)] text-[var(--accent-text)] py-2.5 font-medium mt-2 disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Icon icon="cuida:loading-left-outline" className="h-5 w-5 animate-spin-ccw" />
              <span className="sr-only">{t.login.signingIn}</span>
            </>
          ) : (
            t.login.submit
          )}
        </motion.button>

        <div className="flex items-center gap-3 mt-1">
          <div className="h-px flex-1 bg-[var(--text-muted)]" />
          <span className="text-sm font-medium text-[var(--text-muted)]">
            {t.login.orContinueWith}
          </span>
          <div className="h-px flex-1 bg-[var(--text-muted)]" />
        </div>

        <motion.button
          type="button"
          onClick={() => signInWith("Google")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-4 py-2.5 font-medium text-[var(--text-primary)]"
        >
          <Icon icon="flat-color-icons:google" className="h-5 w-5" />
          Google
        </motion.button>

        <p className="mt-1 text-center text-sm text-[var(--text-muted)]">
          {t.login.noAccount}{" "}
          <Link
            href="/signup"
            className="font-medium text-[var(--accent-2)] underline"
          >
            {t.login.signUpCta}
          </Link>
        </p>
        </motion.form>
      </div>
    </main>
  );
}
