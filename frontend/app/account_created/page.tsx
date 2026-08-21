"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Icon } from "@/components/Icon";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

// Shown once, straight after the confirmation code is accepted. There is no
// back button on purpose: the code behind it has already been spent, so the
// only way on from here is into the app.
export default function AccountCreatedPage() {
  const { language } = useLanguage();
  const t = getTranslations(language);
  const reduceMotion = useReducedMotion();

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--page-bg)] p-6 md:p-10 lg:p-14">
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
          {/* Decorative: the heading below already says this went well. */}
          <Icon
            icon="material-symbols:check-rounded"
            aria-hidden
            className="h-24 w-24 text-[var(--accent-2)]"
          />
        </motion.div>

        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {t.accountCreated.title}
        </h1>

        <p className="text-[var(--text-secondary)]">
          {t.accountCreated.message}
        </p>

        <Link
          href="/login"
          className="btn-hover mt-4 w-full rounded-lg bg-[var(--accent-bg)] py-2.5 font-medium text-[var(--accent-text)]"
        >
          {t.accountCreated.cta}
        </Link>
      </motion.div>
    </main>
  );
}
