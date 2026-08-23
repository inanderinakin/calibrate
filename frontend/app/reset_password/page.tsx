"use client";

import { Suspense, useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";
import { post_forgot_password, post_reset_password } from "@/lib/api";
import BackButton from "@/components/BackButton";
import { Icon } from "@/components/Icon";
import PasswordRules, { passwordMeetsRules } from "@/components/PasswordRules";

const RESEND_AFTER_SECONDS = 60;

function ResetPasswordForm() {
  const params = useSearchParams();
  const { language } = useLanguage();
  const t = getTranslations(language);
  const reduceMotion = useReducedMotion();

  const email = params.get("email") ?? "";

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_AFTER_SECONDS);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setTimeout(() => setSecondsLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function handleResend() {
    setResending(true);
    setError(null);
    setResent(false);

    try {
      await post_forgot_password(email);
      setResent(true);
      setSecondsLeft(RESEND_AFTER_SECONDS);
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t.forgotPassword.genericError);
    }
    finally {
      setResending(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResent(false);

    if (!email) {
      setError(t.forgotPassword.missingEmail);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t.forgotPassword.passwordMismatch);
      return;
    }

    setSubmitting(true);

    try {
      await post_reset_password(email, code.trim(), newPassword);
      setDone(true);
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t.forgotPassword.resetError);
    }
    finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-card w-full max-w-md flex flex-col items-center gap-4 rounded-[24px] p-8 text-center"
      >
        <motion.div
          initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
        >
          <Icon
            icon="material-symbols:check-rounded"
            aria-hidden
            className="h-24 w-24 text-[var(--accent-2)]"
          />
        </motion.div>

        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {t.forgotPassword.doneTitle}
        </h1>

        <p className="text-[var(--text-secondary)]">
          {t.forgotPassword.doneMessage}
        </p>

        <Link
          href="/login"
          className="btn-hover mt-4 w-full rounded-lg bg-[var(--accent-bg)] py-2.5 font-medium text-[var(--accent-text)]"
        >
          {t.forgotPassword.doneCta}
        </Link>
      </motion.div>
    );
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
        {t.forgotPassword.resetTitle}
      </motion.h1>

      {email && (
        <p className="text-sm text-[var(--text-secondary)]">
          {t.forgotPassword.sentTo(email)}
        </p>
      )}

      <p className="text-sm text-[var(--text-muted)]">
        {t.forgotPassword.spamHint}
      </p>

      <input
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder={t.forgotPassword.code}
        aria-label={t.forgotPassword.code}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="glass-input rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
      />

      <input
        required
        type="password"
        autoComplete="new-password"
        minLength={8}
        placeholder={t.forgotPassword.newPassword}
        aria-label={t.forgotPassword.newPassword}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="glass-input rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
      />

      <PasswordRules value={newPassword} />

      <input
        required
        type="password"
        autoComplete="new-password"
        minLength={8}
        placeholder={t.forgotPassword.confirmPassword}
        aria-label={t.forgotPassword.confirmPassword}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
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
        disabled={submitting || !passwordMeetsRules(newPassword)}
        aria-busy={submitting}
        whileHover={submitting ? undefined : { scale: 1.02 }}
        whileTap={submitting ? undefined : { scale: 0.97 }}
        className="flex items-center justify-center rounded-lg bg-[var(--accent-bg)] text-[var(--accent-text)] py-2.5 font-medium mt-2 disabled:opacity-70"
      >
        {submitting ? (
          <>
            <Icon icon="cuida:loading-left-outline" className="h-5 w-5 animate-spin-ccw" />
            <span className="sr-only">{t.forgotPassword.resetting}</span>
          </>
        ) : (
          t.forgotPassword.resetSubmit
        )}
      </motion.button>

      {resent && !error && (
        <p className="text-sm text-[var(--text-secondary)]">
          {t.forgotPassword.codeResent}
        </p>
      )}

      {secondsLeft > 0 ? (
        <p className="text-sm text-[var(--text-secondary)]" aria-live="polite">
          {t.forgotPassword.resendIn(secondsLeft)}
        </p>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || !email}
          className="self-start text-sm font-bold text-[var(--accent-2)] underline disabled:opacity-60 disabled:no-underline"
        >
          {resending ? t.forgotPassword.resending : t.forgotPassword.resend}
        </button>
      )}
    </motion.form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex flex-col bg-[var(--page-bg)] p-6 md:p-10 lg:p-14">
      <div className="mb-6 flex justify-start">
        <BackButton fallbackHref="/forgot_password" />
      </div>

      <div className="flex flex-1 items-center justify-center">
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
