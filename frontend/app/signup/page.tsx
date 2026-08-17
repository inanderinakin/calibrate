"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { saveProfile } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";
import { post_signup } from "@/lib/api";
import BackButton from "@/components/BackButton";

export default function SignupPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = getTranslations(language);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studyField, setStudyField] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await post_signup(email, password, firstName, lastName);

      saveProfile({ firstName, lastName, email, studyField });

      router.push(`/verify_email?email=${encodeURIComponent(email)}`);
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t.signup.genericError);
    }
    finally {
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
          {t.signup.title}
        </motion.h1>

        <input
          required
          placeholder={t.signup.firstName}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="glass-input rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
        />
        <input
          required
          placeholder={t.signup.lastName}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="glass-input rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
        />
        <input
          required
          type="email"
          placeholder={t.signup.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="glass-input rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
        />
        <input
          required
          type="password"
          placeholder={t.signup.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="glass-input rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
        />
        <input
          required
          placeholder={t.signup.fieldOfStudy}
          value={studyField}
          onChange={(e) => setStudyField(e.target.value)}
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
          className="rounded-lg bg-[var(--accent-bg)] text-[var(--accent-text)] py-2.5 font-medium mt-2"
        >
          {t.signup.submit}
        </motion.button>

        <p className="mt-1 text-center text-sm text-[var(--text-muted)]">
          {t.signup.haveAccount}{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--accent-2)] underline"
          >
            {t.signup.logInCta}
          </Link>
        </p>
        </motion.form>
      </div>
    </main>
  );
}
