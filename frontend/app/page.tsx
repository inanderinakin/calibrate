"use client";

import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";

const FEATURES = [
  {
    title: "AI-Powered Analysis",
    description:
      "Advanced AI analyses your CV and highlights your strengths.",
    icon: "solar:graph-new-up-linear",
  },
  {
    title: "Personalised Guidance",
    description: "Get tailored recommendations that match your goals.",
    icon: "solar:map-arrow-up-linear",
  },
  {
    title: "Skill Insights",
    description: "Discover your top skills and areas for growth.",
    icon: "solar:chart-2-linear",
  },
  {
    title: "Career Pathways",
    description: "Explore the best career paths for your profile.",
    icon: "solar:route-linear",
  },
];

function IntroPage({ onContinue }: { onContinue: () => void }) {
  return (
    <main className="landing-texture min-h-screen flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-[145px] text-center">
        <div className="flex flex-col items-center gap-8">
          <h1 className="font-black text-[var(--landing-accent)] text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] leading-none">
            CALIBRATE
          </h1>

          <p className="font-black text-[var(--landing-accent)] text-2xl sm:text-3xl md:text-5xl">
            Your AI-Powered CV analyser
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 w-full max-w-[350px]">
          <button
            type="button"
            onClick={onContinue}
            className="w-full bg-[var(--landing-accent)] text-[var(--on-accent)] rounded-[32px] px-9 py-3 font-black text-2xl md:text-3xl flex items-center justify-center gap-4"
          >
            Start Now
            <Icon
              icon="mdi-light:arrow-up"
              className="w-7 h-7 rotate-90"
            />
          </button>

          
        </div>
      </div>
    </main>
  );
}

function MainLandingPage() {
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
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-7 py-5 sm:px-10 md:px-12 lg:px-16 2xl:max-w-[1680px]">

        {/* HEADER */}
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-left text-[16px] font-black tracking-[-0.03em] text-[var(--landing-accent)] sm:text-[18px] lg:text-[22px]"
          >
            Calibrate
          </Link>

          <nav className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-[var(--accent-bg)] text-[var(--accent-text)] px-4 py-1.5 text-[10px] font-medium leading-none sm:px-5 sm:py-2 sm:text-[11px] lg:px-6 lg:py-2.5 lg:text-[13px]"
            >
              Login
            </Link>

            <Link
              href="/signup"
              className="rounded-lg border border-[var(--landing-accent)] bg-transparent px-4 py-1.5 text-[10px] font-medium leading-none text-[var(--landing-accent)] sm:px-5 sm:py-2 sm:text-[11px] lg:px-6 lg:py-2.5 lg:text-[13px]"
            >
              Sign in
            </Link>

            <button
              type="button"
              aria-label="Open menu"
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

        <div className="flex flex-1 flex-col justify-center gap-12 lg:gap-16">

        {/* HERO */}
        <section className="grid grid-cols-1 items-center gap-8 pt-10 sm:pt-14 lg:grid-cols-[1fr_1.3fr] lg:gap-12 lg:pt-0">

          {/* LEFT SIDE */}
          <div className="max-w-[310px] lg:max-w-[440px]">
            <h1 className="text-[32px] font-black leading-[0.98] tracking-[-0.045em] text-[var(--landing-accent)] sm:text-[39px] lg:text-[56px] 2xl:text-[64px]">
              Your <span className="text-[var(--accent-2)]">CV.</span>
              <br />
              Our <span className="text-[var(--accent-2)]">AI.</span>
              <br />
              <span className="text-[var(--accent-2)]">
                Perfect Match.
              </span>
            </h1>

            <p className="mt-4 max-w-[230px] text-[11px] font-bold leading-[1.35] text-[var(--landing-accent)] sm:text-[12px] lg:mt-6 lg:max-w-[330px] lg:text-[17px]">
              Upload your CV, discover skill gaps, get personalized learning
              roadmaps.
            </p>

          
          </div>

          {/* CAREER WORKFLOW IMAGE */}
          <div className="w-full flex items-center justify-center">
            <Image
              src={workflowImage}
              alt="Calibrate career workflow"
              width={1000}
              height={400}
              priority
              className="w-full h-auto max-h-[46vh] object-contain"
            />
          </div>
        </section>

        {/* FEATURE CARDS */}
        <section className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2 lg:gap-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="flex min-h-[54px] items-center gap-3 rounded-[5px] border border-[var(--landing-accent)] bg-[var(--card-bg)]/35 px-3 py-2 sm:min-h-[62px] sm:gap-4 sm:px-4 lg:min-h-[78px] lg:gap-5 lg:rounded-lg lg:px-6"
            >
              <Icon
                icon={feature.icon}
                width={28}
                height={28}
                className="shrink-0 text-[var(--landing-accent)] sm:h-8 sm:w-8 lg:h-10 lg:w-10"
              />

              <div className="min-w-0">
                <h2 className="text-[9px] font-black leading-tight text-[var(--landing-accent)] sm:text-[10px] lg:text-[15px]">
                  {feature.title}
                </h2>

                <p className="mt-0.5 text-[6px] font-medium leading-[1.25] text-[var(--landing-accent)] opacity-80 sm:text-[7px] lg:mt-1 lg:text-[11px]">
                  {feature.description}
                </p>
              </div>
            </article>
          ))}
        </section>
        </div>
      </div>
    </main>
  );
}

export default function LandingPage() {
  const [showIntro, setShowIntro] = useState(true);

  if (showIntro) {
    return (
      <IntroPage
        onContinue={() => setShowIntro(false)}
      />
    );
  }

  return <MainLandingPage />;
}