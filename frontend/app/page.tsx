"use client";

import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations, type Translations } from "@/lib/translations";

// Order matches t.landing.features in translations.ts — icons aren't
// translatable text, so they're kept out of the language-keyed dictionary.
const FEATURE_ICONS = [
  "solar:graph-new-up-linear",
  "solar:map-arrow-up-linear",
  "solar:chart-2-linear",
  "solar:route-linear",
];

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

function IntroPage({ onContinue, t }: { onContinue: () => void; t: Translations }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Enter") {
        onContinue();
      }
    }

    window.addEventListener("keydown", handleKey);

    return () => window.removeEventListener("keydown", handleKey);
  }, [onContinue]);

  return (
    <main className="landing-texture min-h-screen flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-[145px] text-center">
        <div className="flex flex-col items-center gap-8">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h1 className="font-black text-[var(--landing-accent)] text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] leading-none">
              CALIBRATE
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="font-black text-[var(--landing-accent)] text-2xl sm:text-3xl md:text-5xl"
          >
            {t.landing.tagline}
          </motion.p>
        </div>

        <div className="flex flex-col items-center gap-3 w-full max-w-[350px]">
          <motion.button
            type="button"
            onClick={onContinue}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="w-full bg-[var(--landing-accent)] text-[var(--on-accent)] rounded-[32px] px-9 py-3 font-black text-2xl md:text-3xl flex items-center justify-center gap-4"
          >
            {t.landing.startNow}
            <Icon
              icon="mdi-light:arrow-up"
              className="w-7 h-7 rotate-90"
            />
          </motion.button>
        </div>
      </div>
    </main>
  );
}

function MainLandingPage({ onBack, t }: { onBack?: () => void; t: Translations }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const workflowImage = isDark
    ? "/bg/career_workflow_navy_blue 2 (1).png"
    : "/bg/career_workflow_red 2 (1).png";

  return (
    <main className="landing-texture min-h-screen overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mx-auto min-h-screen w-full max-w-[1440px] px-7 py-5 sm:px-10 md:px-12 lg:px-16"
      >
        {/* HEADER */}
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-left text-[16px] font-black tracking-[-0.03em] text-[var(--landing-accent)] sm:text-[18px]"
          >
            Calibrate
          </Link>

          <nav className="flex items-center gap-2.5 sm:gap-3">
            {onBack && (
              <motion.button
                type="button"
                onClick={onBack}
                aria-label="Back to intro"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="glass flex h-8 w-8 items-center justify-center rounded-full text-[var(--landing-accent)] sm:h-9 sm:w-9"
              >
                <Icon
                  icon="weui:arrow-outlined"
                  className="h-5 w-5 rotate-180"
                />
              </motion.button>
            )}

            <Link
              href="/login"
              className="btn-hover rounded-lg bg-[var(--accent-bg)] text-[var(--accent-text)] px-4 py-1.5 text-[10px] font-medium leading-none sm:px-5 sm:py-2 sm:text-[11px]"
            >
              {t.landing.login}
            </Link>

            <Link
              href="/signup"
              className="btn-hover rounded-lg border border-[var(--landing-accent)] bg-transparent px-4 py-1.5 text-[10px] font-medium leading-none text-[var(--landing-accent)] sm:px-5 sm:py-2 sm:text-[11px]"
            >
              {t.landing.signIn}
            </Link>

            <button
              type="button"
              aria-label={t.landing.openMenu}
              className="ml-0.5 flex h-7 w-7 items-center justify-center text-[var(--landing-accent)] sm:h-8 sm:w-8"
            >
              <Icon
                icon="material-symbols:menu-rounded"
                width={20}
                height={20}
              />
            </button>
          </nav>
        </header>

        {/* HERO */}
        <section className="grid grid-cols-1 gap-8 pt-10 sm:pt-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-8 lg:pt-11">
          {/* LEFT SIDE */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-[310px]"
          >
            <h1 className="text-[32px] font-black leading-[0.98] tracking-[-0.045em] text-[var(--landing-accent)] sm:text-[39px]">
              {t.landing.heroLine1} <span className="text-[var(--accent-2)]">{t.landing.heroWordCv}</span>
              <br />
              {t.landing.heroLine2} <span className="text-[var(--accent-2)]">{t.landing.heroWordAi}</span>
              <br />
              <span className="text-[var(--accent-2)]">
                {t.landing.heroWordMatch}
              </span>
            </h1>

            <p className="mt-4 max-w-[230px] text-[11px] font-bold leading-[1.35] text-[var(--landing-accent)] sm:text-[12px]">
              {t.landing.heroSubtitle}
            </p>
          </motion.div>

          {/* CAREER WORKFLOW IMAGE */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="w-full flex items-start justify-center"
          >
            <Image
              src={workflowImage}
              alt={t.landing.workflowImageAlt}
              width={1000}
              height={400}
              priority
              className="w-full h-auto object-contain"
            />
          </motion.div>
        </section>

        {/* FEATURE CARDS */}
        <motion.section
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-9 grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2 lg:mt-10"
        >
          {t.landing.features.map((feature, i) => (
            <motion.article
              key={feature.title}
              variants={staggerItem}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              whileHover={{ scale: 1.02 }}
              className="glass-card flex min-h-[54px] items-center gap-3 rounded-[5px] border border-[var(--landing-accent)] px-3 py-2 sm:min-h-[62px] sm:gap-4 sm:px-4"
            >
              <Icon
                icon={FEATURE_ICONS[i]}
                width={28}
                height={28}
                className="shrink-0 text-[var(--landing-accent)] sm:h-8 sm:w-8"
              />

              <div className="min-w-0">
                <h2 className="text-[9px] font-black leading-tight text-[var(--landing-accent)] sm:text-[10px]">
                  {feature.title}
                </h2>

                <p className="mt-0.5 text-[6px] font-medium leading-[1.25] text-[var(--landing-accent)] opacity-80 sm:text-[7px]">
                  {feature.description}
                </p>
              </div>
            </motion.article>
          ))}
        </motion.section>

        {/* FOOTER */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center justify-center pt-8 pb-3 sm:pt-10"
        >
          <p className="text-[5px] font-black tracking-wide text-[var(--landing-accent)] sm:text-[6px]">
            {t.landing.trustedBy}
          </p>

          <div className="mt-0.5 flex items-center gap-1 text-[var(--landing-accent)]">
            <Icon
              icon="simple-icons:amazon"
              width={11}
              height={11}
            />

            <span className="text-[6px] font-black">
              amazon
            </span>
          </div>
        </motion.footer>
      </motion.div>
    </main>
  );
}

export default function LandingPage() {
  const [showIntro, setShowIntro] = useState(true);
  const { language } = useLanguage();
  const t = getTranslations(language);

  if (showIntro) {
    return (
      <IntroPage
        onContinue={() => setShowIntro(false)}
        t={t}
      />
    );
  }

  return (
    <MainLandingPage
      onBack={() => setShowIntro(true)}
      t={t}
    />
  );
}
