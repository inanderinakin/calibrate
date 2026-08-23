"use client";

import { Suspense, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";
import { isTimeout, post_forgot_password } from "@/lib/api";
import BackButton from "@/components/BackButton";
import { Icon } from "@/components/Icon";

function ForgotPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { language } = useLanguage();
  const t = getTranslations(language);

  // Seeded from the query the login page appends, still editable if they meant a
  // different address.
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await post_forgot_password(email);
      router.push(`/reset_password?email=${encodeURIComponent(email)}`);
    }
    catch (err) {
      setError(isTimeout(err) ? t.forgotPassword.timeoutError : err instanceof Error ? err.message : t.forgotPassword.genericError);
      setSubmitting(false);
    }
  }

  return (
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
            {t.forgotPassword.title}
          </motion.h1>

          <p className="text-sm text-[var(--text-secondary)]">
            {t.forgotPassword.intro}
          </p>

          <input
            required
            type="email"
            autoComplete="email"
            placeholder={t.forgotPassword.email}
            aria-label={t.forgotPassword.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
                <span className="sr-only">{t.forgotPassword.sending}</span>
              </>
            ) : (
              t.forgotPassword.submit
            )}
          </motion.button>

          <p className="mt-1 text-center text-sm text-[var(--text-muted)]">
            <Link
              href="/login"
              className="font-medium text-[var(--accent-2)] underline"
            >
              {t.forgotPassword.backToLogin}
            </Link>
          </p>
    </motion.form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex flex-col bg-[var(--page-bg)] p-6 md:p-10 lg:p-14">
      <div className="mb-6 flex justify-start">
        <BackButton fallbackHref="/login" />
      </div>

      <div className="flex flex-1 items-center justify-center">
        <Suspense>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
