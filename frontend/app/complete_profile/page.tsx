"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AuthBanner from "@/components/AuthBanner";
import PrefsControls from "@/components/PrefsControls";
import SuggestInput from "@/components/SuggestInput";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { updateProfile } from "@/lib/api";
import { countryAliases, countryLabel, countrySuggestions, toStoredCountry } from "@/lib/countries";
import { resolveEntryPath } from "@/lib/entry";
import { studyFieldSuggestions } from "@/lib/studyFields";
import { getTranslations } from "@/lib/translations";
import { useRequireAuth } from "@/lib/useRequireAuth";

export default function CompleteProfilePage() {
  const allowed = useRequireAuth();
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { language } = useLanguage();
  const t = getTranslations(language).completeProfile;

  const [country, setCountry] = useState(() => countryLabel(user?.country ?? "", language));
  const [studyField, setStudyField] = useState(user?.studyField ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await updateProfile(
        user.firstName,
        user.lastName,
        toStoredCountry(country, language),
        studyField.trim(),
      );

      updateUser({
        country: result.country,
        studyField: result.study_field,
      });

      router.replace(await resolveEntryPath());
    }
    catch {
      setError(t.saveFailed);
      setSubmitting(false);
    }
  }

  if (!allowed || !user) return null;

  return (
    <main className="min-h-screen bg-[var(--page-bg)] lg:grid lg:grid-cols-[4fr_7fr]">
      <AuthBanner />

      <div className="flex min-h-screen flex-col p-6 md:p-10 lg:p-14">
        <div className="flex justify-end">
          <PrefsControls />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="glass-card flex w-full max-w-md flex-col gap-4 rounded-[24px] p-8"
          >
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              {t.title}
            </h1>

            <p className="text-sm text-[var(--text-secondary)]">
              {t.subtitle}
            </p>

            <SuggestInput
              id="complete-profile-study-field"
              required
              label={t.studyField}
              value={studyField}
              onChange={setStudyField}
              suggestions={studyFieldSuggestions(language)}
            />

            <SuggestInput
              id="complete-profile-country"
              required
              label={t.country}
              value={country}
              onChange={setCountry}
              suggestions={countrySuggestions(language)}
              aliases={countryAliases(language)}
            />

            {error && (
              <p role="alert" className="rounded-lg border border-[var(--accent-2)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]">
                {error}
              </p>
            )}

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={submitting ? undefined : { scale: 1.02 }}
              whileTap={submitting ? undefined : { scale: 0.97 }}
              className="mt-2 rounded-lg bg-[var(--accent-bg)] py-2.5 font-medium text-[var(--accent-text)] disabled:opacity-70"
            >
              {submitting ? t.saving : t.submit}
            </motion.button>
          </motion.form>
        </div>
      </div>
    </main>
  );
}
