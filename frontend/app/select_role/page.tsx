"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import AppShell from "@/components/AppShell";
import StepIndicator from "@/components/StepIndicator";
import { session } from "@/lib/session";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

// title/description come from t.selectRole.roles[id] at render time — this
// stays a plain language-independent const.
const ROLES = [
  { id: "backend", apiName: "Backend Engineer", icon: "tabler:code" },
  { id: "data-scientist", apiName: "Data Scientist", icon: "fluent:data-pie-20-regular" },
  { id: "ml-engineer", apiName: "ML Engineer", icon: "mdi:brain" },
  { id: "full-stack", apiName: "Full Stack Developer", icon: "ri:stack-fill" },
  { id: "frontend", apiName: "Frontend Engineer", icon: "game-icons:pc" },
  { id: "devops", apiName: "DevOps", icon: "mdi:cloud" },
  { id: "mobile", apiName: "Mobile Engineer", icon: "mdi:cellphone" },
  { id: "qa", apiName: "QA Engineer", icon: "mdi:bug-check" },
  { id: "software", apiName: "Software Developer", icon: "mdi:laptop" },
] as const;

export default function SelectRolePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = getTranslations(language);

  const [selected, setSelected] = useState<string[]>([]);
  const [cvUploaded, setCvUploaded] = useState<boolean | null>(null);

  useEffect(() => {
    const skills = session.getCvSkills();

    setCvUploaded(Array.isArray(skills) && skills.length > 0);
  }, []);

  function toggleRole(apiName: string) {
    setSelected((current) =>
      current.includes(apiName)
        ? current.filter((r) => r !== apiName)
        : [...current, apiName]
    );
  }

  function handleContinue() {
    if (selected.length === 0) return;

    session.setTargetRoles(selected);
    router.push("/analyse_cv");
  }

  // Avoid showing the wrong screen before checking the session.
  if (cvUploaded === null) {
    return (
      <AppShell>
        <main className="page-texture min-h-screen px-6 py-10 md:px-10 lg:px-14" />
      </AppShell>
    );
  }

  // No CV uploaded yet
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

            <button
              type="button"
              onClick={() => router.push("/upload_cv")}
              className="rounded-[20px] bg-[var(--accent)] px-8 py-3.5 text-lg font-bold text-[var(--on-accent)]"
            >
              {t.common.uploadYourCv}
            </button>
          </div>
        </main>
      </AppShell>
    );
  }

  // CV exists — show the normal role selection page
  return (
    <AppShell>
      <div className="p-6 md:p-10 lg:p-14 flex flex-col items-center gap-8 max-w-5xl mx-auto text-center">
        <StepIndicator activeStep={2} />

        <h1 className="text-3xl md:text-5xl font-bold text-(--accent-2)">
          {t.selectRole.title}
        </h1>

        <p className="text-(--text-primary)">
          {t.selectRole.subtitle}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full text-left">
          {ROLES.map((role) => {
            const isSelected = selected.includes(role.apiName);
            const label = t.selectRole.roles[role.id];

            return (
              <button
                key={role.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleRole(role.apiName)}
                className={`relative rounded-[20px] border-4 p-5 flex items-start gap-4 bg-(--card-bg) transition-colors ${
                  isSelected
                    ? "border-(--accent-bg)"
                    : "border-(--text-secondary)/30"
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-(--hover-bg) flex items-center justify-center shrink-0">
                  <Icon
                    icon={role.icon}
                    className="w-7 h-7 text-(--accent-bg)"
                  />
                </div>

                <div>
                  <p className="font-black text-lg text-(--text-primary)">
                    {label.title}
                  </p>

                  <p className="font-light text-(--text-primary)">
                    {label.description}
                  </p>
                </div>

                {isSelected && (
                  <Icon
                    icon="lets-icons:check-fill"
                    className="absolute top-3 right-3 w-7 h-7 text-(--accent-bg)"
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={selected.length === 0}
          onClick={handleContinue}
          className="bg-(--accent) text-(--on-accent) rounded-[20px] px-10 py-3.5 font-black text-xl flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {selected.length > 1
            ? t.selectRole.continueWithRoles(selected.length)
            : t.selectRole.continue}

          <Icon
            icon="mdi-light:arrow-up"
            className="w-6 h-6 rotate-90"
          />
        </button>

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