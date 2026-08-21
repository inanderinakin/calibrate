"use client";

import { Suspense, useEffect, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";
import { post_resend_code, post_verify_email } from "@/lib/api";
import BackButton from "@/components/BackButton";

const RESEND_AFTER_SECONDS = 60;

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { language } = useLanguage();
  const t = getTranslations(language);

  const email = params.get("email") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
      await post_resend_code(email);
      setResent(true);
      setSecondsLeft(RESEND_AFTER_SECONDS);
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t.verifyEmail.genericError);
    }
    finally {
      setResending(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError(t.verifyEmail.missingEmail);
      return;
    }

    setSubmitting(true);

    try {
      await post_verify_email(email, code.trim());
      router.replace("/account_created");
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t.verifyEmail.genericError);
    }
    finally {
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
        {t.verifyEmail.title}
      </motion.h1>

      {email && (
        <p className="text-sm text-[var(--text-secondary)]">
          {t.verifyEmail.sentTo(email)}
        </p>
      )}

      <input
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder={t.verifyEmail.code}
        aria-label={t.verifyEmail.code}
        value={code}
        onChange={(e) => setCode(e.target.value)}
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
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="rounded-lg bg-[var(--accent-bg)] text-[var(--accent-text)] py-2.5 font-medium mt-2 disabled:opacity-60"
      >
        {t.verifyEmail.submit}
      </motion.button>

      {resent && !error && (
        <p className="text-sm text-[var(--text-secondary)]">
          {t.verifyEmail.codeResent}
        </p>
      )}

      {secondsLeft > 0 ? (
        <p className="text-sm text-[var(--text-secondary)]" aria-live="polite">
          {t.verifyEmail.resendIn(secondsLeft)}
        </p>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || !email}
          className="self-start text-sm font-bold text-[var(--accent-2)] underline disabled:opacity-60 disabled:no-underline"
        >
          {resending ? t.verifyEmail.resending : t.verifyEmail.resend}
        </button>
      )}
    </motion.form>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen flex flex-col bg-[var(--page-bg)] p-6 md:p-10 lg:p-14">
      <div className="mb-6 flex justify-start">
        <BackButton fallbackHref="/signup" />
      </div>

      <div className="flex flex-1 items-center justify-center">
        <Suspense>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </main>
  );
}
