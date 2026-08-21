"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import StepIndicator from "@/components/StepIndicator";
import { authedFetch, errorMessage, isTimeout, saveAnalysis } from "@/lib/api";
import { session } from "@/lib/session";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

const GAPS_TIMEOUT_MS = 30_000;
const REPORT_TIMEOUT_MS = 180_000;

export default function AnalyseCvPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = getTranslations(language);
  const CHECKLIST = t.analyseCv.checklist;
  const started = useRef(-1);

  const [step, setStep] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [cvUploaded, setCvUploaded] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);

  function retry() {
    setError(null);
    setStep(2);
    setAttempt((n) => n + 1);
  }

  useEffect(() => {
    const cvSkills = session.getCvSkills();

    setCvUploaded(Array.isArray(cvSkills) && cvSkills.length > 0);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || cvUploaded === null || !cvUploaded) return;
    if (started.current === attempt) return;

    started.current = attempt;

    const cvSkills = session.getCvSkills();
    const targetRoles = session.getTargetRoles();

    if (!cvSkills || cvSkills.length === 0 || !targetRoles || targetRoles.length === 0) {
      return;
    }

    async function run() {
      try {
        const gapsRes = await authedFetch("/compute_gaps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cv_skills: cvSkills,
            target_roles: targetRoles,
          }),
        }, GAPS_TIMEOUT_MS);

        if (!gapsRes.ok) {
          throw new Error(
            await errorMessage(
              gapsRes,
              t.analyseCv.gapsError
            )
          );
        }

        const gaps = (await gapsRes.json()).gaps;

        session.setGaps(gaps);
        setStep(3);

        const reportRes = await authedFetch(`/recommendations?language=${language}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gaps),
        }, REPORT_TIMEOUT_MS);

        if (!reportRes.ok) {
          throw new Error(
            await errorMessage(
              reportRes,
              t.analyseCv.roadmapError
            )
          );
        }

        const report = (await reportRes.json()).recommendations;

        session.setReport(report);
        setStep(4);

        // Keep the analysis on the account so it survives closing the tab.
        saveAnalysis({
          cv_skills: cvSkills ?? [],
          target_roles: targetRoles ?? [],
          gaps,
          report,
          cv_filename: session.getCvFilename(),
          cv_size: session.getCvSize(),
          cv_type: session.getCvType(),
          cv_uploaded_at: session.getCvUploadedAt(),
        }).catch(() => {});
      } catch (e) {
        setError(
          isTimeout(e)
            ? t.analyseCv.timeoutError
            : e instanceof Error
              ? e.message
              : t.analyseCv.genericError
        );
      }
    }

    run();
  }, [loaded, cvUploaded, attempt]);

  /*
   * Loading state while checking whether a CV exists.
   */
  if (!loaded || cvUploaded === null) {
    return <AppShell backHref="/select_role" />;
  }

  /*
   * No CV uploaded yet.
   */
  if (!cvUploaded) {
    return (
      <AppShell backHref="/select_role">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-5 rounded-[30px] glass-card p-8 shadow-lg">
          <Icon
            icon="mdi:file-search-outline"
            className="h-14 w-14 text-[var(--accent-2)]"
          />

          <h1 className="text-3xl font-black text-[var(--text-primary)] md:text-5xl">
            {t.common.nothingToShowYet}
          </h1>

          <p className="text-lg text-[var(--text-secondary)]">
            {t.common.uploadCvPrompt}
          </p>

          <Link
            href="/upload_cv"
            className="btn-hover rounded-[20px] bg-[var(--accent)] px-8 py-3.5 text-lg font-bold text-[var(--on-accent)]"
          >
            {t.common.uploadYourCv}
          </Link>
        </div>
      </AppShell>
    );
  }

  const done = step >= CHECKLIST.length;

  return (
    <AppShell backHref="/select_role">
      <div className="flex flex-col items-center gap-8 max-w-4xl mx-auto text-center">
        <StepIndicator activeStep={3} />

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-5xl font-bold text-(--accent-2)"
        >
          {error
            ? t.analyseCv.titleError
            : done
              ? t.analyseCv.titleDone
              : t.analyseCv.titleInProgress}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-(--text-primary) max-w-xl"
        >
          {error
            ? t.analyseCv.subtitleError
            : done
              ? t.analyseCv.subtitleDone
              : t.analyseCv.subtitleInProgress}
        </motion.p>

        <div className="glass-card rounded-[23px] shadow-lg p-8 w-full flex flex-col gap-6 text-left">
          {CHECKLIST.map((item, i) => {
            const isDone = i < step;
            const isActive = i === step && !error;

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex items-start gap-4"
              >
                {isDone ? (
                  <Icon
                    icon="lets-icons:check-fill"
                    className="w-9 h-9 text-(--accent-bg) shrink-0"
                  />
                ) : (
                  <Icon
                    icon="cuida:loading-left-outline"
                    className={`w-9 h-9 text-(--accent-bg) shrink-0 ${
                      isActive ? "animate-spin-ccw" : "opacity-30"
                    }`}
                  />
                )}

                <div>
                  <p className="font-black text-(--text-primary)">
                    {item.title}
                  </p>

                  <p className="text-sm font-light text-(--text-primary)">
                    {item.note}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {error ? (
          <p className="glass-card w-full rounded-[20px] border-2 border-(--accent-2) p-4 text-left font-semibold text-(--text-primary)">
            {error}
          </p>
        ) : !done && (
          <div className="w-full flex flex-col items-center gap-4">
            <div
              role="progressbar"
              aria-label={t.analyseCv.titleInProgress}
              className="w-full h-3 rounded-full bg-[var(--accent-bg)]/20 overflow-hidden"
            >
              <div className="h-full w-1/3 rounded-full bg-(--accent-bg) animate-indeterminate" />
            </div>

            <p className="text-(--text-primary) font-light">
              {t.analyseCv.waitNote}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {error ? (
            <>
              <button
                type="button"
                onClick={retry}
                className="btn-hover bg-(--accent) text-(--on-accent) rounded-[20px] px-8 py-3.5 font-bold text-lg flex items-center gap-3"
              >
                {t.analyseCv.tryAgain}
                <Icon
                  icon="mdi:refresh"
                  className="w-6 h-6"
                />
              </button>

              <Link
                href="/upload_cv"
                className="btn-hover border-2 border-(--accent-bg) text-(--accent-bg) rounded-[20px] px-8 py-3.5 font-bold text-lg flex items-center gap-3"
              >
                {t.analyseCv.startOver}
                <Icon
                  icon="mdi-light:arrow-up"
                  className="w-6 h-6 rotate-90"
                />
              </Link>
            </>
          ) : (
            <motion.button
              type="button"
              disabled={!done}
              onClick={() => router.push("/dashboard")}
              whileHover={done ? { scale: 1.03 } : undefined}
              whileTap={done ? { scale: 0.97 } : undefined}
              className="bg-(--accent) text-(--on-accent) rounded-[20px] px-8 py-3.5 font-bold text-lg flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.analyseCv.continueToDashboard}
              <Icon
                icon="mdi-light:arrow-up"
                className="w-6 h-6 rotate-90"
              />
            </motion.button>
          )}

          {done && (
            <Link
              href="/profile"
              className="btn-hover border-2 border-(--accent-bg) text-(--accent-bg) rounded-[20px] px-8 py-3.5 font-bold text-lg flex items-center gap-3"
            >
              {t.analyseCv.checkProfileSettings}
              <Icon
                icon="solar:settings-linear"
                className="w-6 h-6"
              />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 text-(--text-primary)">
          <Icon icon="gala:secure" className="w-6 h-6" />
          <span className="font-black">
            {t.common.secureData}
          </span>
        </div>
      </div>
    </AppShell>
  );
}