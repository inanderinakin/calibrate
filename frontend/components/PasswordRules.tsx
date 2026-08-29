"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Icon } from "@/components/Icon";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";
import { duration, ease } from "@/lib/motion";

// Cognito decides what it accepts, not this list. Keep it in step with PasswordPolicy
// in backend/template.yaml, or the form promises something the sign up then refuses.
const RULES = [
  { key: "length", test: (value: string) => value.length >= 8 },
  { key: "lowercase", test: (value: string) => /[a-z]/.test(value) },
  { key: "uppercase", test: (value: string) => /[A-Z]/.test(value) },
  { key: "number", test: (value: string) => /[0-9]/.test(value) },
] as const;

export function passwordMeetsRules(value: string) {
  return RULES.every((rule) => rule.test(value));
}

export default function PasswordRules({ value }: { value: string }) {
  const { language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const t = getTranslations(language).common.passwordRules;

  const open = value.length > 0 && !passwordMeetsRules(value);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="rules"
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: "auto",
            opacity: 1,
            transition: { duration: reduceMotion ? 0 : duration.slow, ease: ease.smoothOut },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: { duration: reduceMotion ? 0 : duration.medium, ease: ease.smoothOut },
          }}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
            <p>{t.title}</p>

            <ul className="flex flex-col gap-1">
              {RULES.map((rule) => {
                const met = rule.test(value);

                return (
                  <li key={rule.key} className="flex items-center gap-2">
                    {/* Both states are boxed at the same size so the label does not shift
                        sideways the moment a rule starts passing. */}
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {met ? (
                        <Icon
                          icon="material-symbols:check-rounded"
                          aria-hidden
                          className="h-4 w-4 text-[var(--accent-2)]"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]"
                        />
                      )}
                    </span>

                    <span className={met ? "text-[var(--accent-2)]" : undefined}>
                      {t[rule.key]}
                    </span>
                    <span className="sr-only">{met ? t.met : t.notMet}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
