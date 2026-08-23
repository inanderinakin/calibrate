"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { saveProfile } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";
import { post_signup } from "@/lib/api";
import { studyFieldSuggestions } from "@/lib/studyFields";
import { countryAliases, countrySuggestions, toStoredCountry } from "@/lib/countries";
import BackButton from "@/components/BackButton";
import SuggestInput from "@/components/SuggestInput";
import AuthBanner from "@/components/AuthBanner";
import PrefsControls from "@/components/PrefsControls";

export default function SignupPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = getTranslations(language);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studyField, setStudyField] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await post_signup(email, password, firstName, lastName);

      saveProfile({
        firstName,
        lastName,
        email,
        studyField,
        country: toStoredCountry(country, language),
      });

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
    <main className="min-h-screen bg-[var(--page-bg)] lg:grid lg:grid-cols-[5fr_6fr]">
      <AuthBanner />

      <div className="flex min-h-screen flex-col p-6 md:p-10 lg:p-14">
        <div className="mb-6 flex items-center justify-between gap-4">
          <BackButton fallbackHref="/" />
          <PrefsControls />
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

        {/* Names sit side by side on anything wider than a phone; the card is
            only 448px, so on a phone they stack to keep each field usable. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="signup-first-name"
              className="text-sm font-medium text-[var(--text-primary)]"
            >
              {t.signup.firstName}
            </label>
            <input
              id="signup-first-name"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="glass-input w-full rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="signup-last-name"
              className="text-sm font-medium text-[var(--text-primary)]"
            >
              {t.signup.lastName}
            </label>
            <input
              id="signup-last-name"
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="glass-input w-full rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signup-email"
            className="text-sm font-medium text-[var(--text-primary)]"
          >
            {t.signup.email}
          </label>
          <input
            id="signup-email"
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass-input w-full rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signup-password"
            className="text-sm font-medium text-[var(--text-primary)]"
          >
            {t.signup.password}
          </label>
          <input
            id="signup-password"
            required
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass-input w-full rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-2)]"
          />
        </div>

        <SuggestInput
          id="signup-study-field"
          required
          label={t.signup.fieldOfStudy}
          value={studyField}
          onChange={setStudyField}
          suggestions={studyFieldSuggestions(language)}
        />

        <SuggestInput
          id="signup-country"
          required
          label={t.signup.country}
          value={country}
          onChange={setCountry}
          suggestions={countrySuggestions(language)}
          aliases={countryAliases(language)}
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
      </div>
    </main>
  );
}
