"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import AppShell from "@/components/AppShell";
import StepIndicator from "@/components/StepIndicator";
import { API_URL, errorMessage } from "@/lib/api";
import { session } from "@/lib/session";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

export default function AnalyseCvPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = getTranslations(language);
  const CHECKLIST = t.analyseCv.checklist;
  const started = useRef(false);

  const [step, setStep] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [cvUploaded, setCvUploaded] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const cvSkills = session.getCvSkills();

    setCvUploaded(Array.isArray(cvSkills) && cvSkills.length > 0);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || cvUploaded === null || !cvUploaded) return;
    if (started.current) return;

    started.current = true;

    const cvSkills = session.getCvSkills();
    const targetRoles = session.getTargetRoles();

    if (!cvSkills || cvSkills.length === 0 || !targetRoles || targetRoles.length === 0) {
      return;
    }

    async function run() {
      try {
        const gapsRes = await fetch(`${API_URL}/compute_gaps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cv_skills: cvSkills,
            target_roles: targetRoles,
          }),
        });

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

        const reportRes = await fetch(`${API_URL}/recommendations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gaps),
        });

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
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : t.analyseCv.genericError
        );
      }
    }

    run();
  }, [loaded, cvUploaded]);

  /*
   * Loading state while checking whether a CV exists.
   */
  if (!loaded || cvUploaded === null) {
    return (
      <AppShell>
        <main className="page-texture min-h-screen px-6 py-10 md:px-10 lg:px-14" />
      </AppShell>
    );
  }

  /*
   * No CV uploaded yet.
   */
  if (!cvUploaded) {
    return (
      <AppShell>
        <main className="page-texture min-h-screen px-6 py-10 md:px-10 lg:px-14">
          <div className="mx-auto flex max-w-3xl flex-col items-start gap-5 rounded-[30px] bg-[var(--card-bg)] p-8 shadow-lg">
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
              className="rounded-[20px] bg-[var(--accent)] px-8 py-3.5 text-lg font-bold text-[var(--on-accent)]"
            >
              {t.common.uploadYourCv}
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  const done = step >= CHECKLIST.length;
  const progress = Math.round((step / CHECKLIST.length) * 100);

  return (
    <AppShell>
      <div className="p-6 md:p-10 lg:p-14 flex flex-col items-center gap-8 max-w-4xl mx-auto text-center">
        <StepIndicator activeStep={3} />

        <h1 className="text-3xl md:text-5xl font-bold text-(--accent-2)">
          {error
            ? t.analyseCv.titleError
            : done
              ? t.analyseCv.titleDone
              : t.analyseCv.titleInProgress}
        </h1>

        <p className="text-(--text-primary) max-w-xl">
          {error
            ? t.analyseCv.subtitleError
            : done
              ? t.analyseCv.subtitleDone
              : t.analyseCv.subtitleInProgress}
        </p>

        <div className="bg-(--card-bg) rounded-[23px] shadow-lg p-8 w-full flex flex-col gap-6 text-left">
          {CHECKLIST.map((item, i) => {
            const isDone = i < step;
            const isActive = i === step && !error;

            return (
              <div
                key={item.title}
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
                      isActive ? "animate-spin" : "opacity-30"
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
              </div>
            );
          })}
        </div>

        {error ? (
          <p className="w-full rounded-[20px] border-2 border-(--accent-2) p-4 text-left font-semibold text-(--text-primary)">
            {error}
          </p>
        ) : (
          <div className="w-full flex flex-col items-center gap-4">
            <span className="text-4xl font-black text-(--accent-bg)">
              {progress} %
            </span>

            <div className="w-full h-2.5 rounded-full bg-(--hover-bg) overflow-hidden">
              <div
                className="h-full rounded-full bg-(--accent) transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            {!done && (
              <p className="text-(--text-primary) font-light">
                {t.analyseCv.waitNote}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {error ? (
            <Link
              href="/upload_cv"
              className="bg-(--accent) text-(--on-accent) rounded-[20px] px-8 py-3.5 font-bold text-lg flex items-center gap-3"
            >
              {t.analyseCv.startOver}
              <Icon
                icon="mdi-light:arrow-up"
                className="w-6 h-6 rotate-90"
              />
            </Link>
          ) : (
            <button
              type="button"
              disabled={!done}
              onClick={() => router.push("/dashboard")}
              className="bg-(--accent) text-(--on-accent) rounded-[20px] px-8 py-3.5 font-bold text-lg flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.analyseCv.continueToDashboard}
              <Icon
                icon="mdi-light:arrow-up"
                className="w-6 h-6 rotate-90"
              />
            </button>
          )}

          {done && (
            <Link
              href="/profile"
              className="border-2 border-(--accent-bg) text-(--accent-bg) rounded-[20px] px-8 py-3.5 font-bold text-lg flex items-center gap-3"
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