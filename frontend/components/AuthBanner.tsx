"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

// One word per line at a leading below 1, which is what makes the block read as a
// single shape rather than five sentences. The reference goes tighter than this, but it
// relies on a face with clipped descenders and Haskoy's are full length, so below 0.9
// the y of one line starts touching the line under it.
export default function AuthBanner() {
  const { language } = useLanguage();
  const t = getTranslations(language);

  return (
    <aside
      className="relative hidden overflow-hidden bg-[var(--burgundy)] lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20"
    >
      <motion.p
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="font-black uppercase leading-[0.9] tracking-[-0.02em] text-[clamp(3rem,5.5vw,5.5rem)] text-[var(--creamy)]"
      >
        {t.common.authBanner.map((line, i) => (
          <span
            key={i}
            className={`block ${line.accent ? "text-[var(--light-blue)]" : ""}`}
          >
            {line.text}
          </span>
        ))}
      </motion.p>
    </aside>
  );
}
