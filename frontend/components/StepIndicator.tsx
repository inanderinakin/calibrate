"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

export default function StepIndicator({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  const STEPS = [
    { n: 1, label: t.stepIndicator.uploadCv },
    { n: 2, label: t.stepIndicator.selectRole },
    { n: 3, label: t.stepIndicator.analyze },
  ];

  return (
    <div className="flex items-center justify-center gap-4 md:gap-10">
      {STEPS.map((step, i) => {
        const isActive = step.n === activeStep;
        const isDone = step.n < activeStep;
        return (
          <div key={step.n} className="flex items-center gap-4 md:gap-10">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl border-2 border-(--accent-bg) ${
                  isActive || isDone
                    ? "bg-(--accent-bg) text-(--accent-text)"
                    : "bg-transparent text-(--accent-bg)"
                }`}
              >
                {step.n}
              </div>
              <span
                className={`text-sm md:text-base ${
                  isActive ? "font-black" : "font-light"
                } text-(--accent-bg)`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-10 md:w-24 h-0.5 bg-(--accent-bg)" />
            )}
          </div>
        );
      })}
    </div>
  );
}
