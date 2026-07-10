"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";

export default function Home() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      className="min-h-screen flex items-center justify-center relative bg-texture-page px-8"
    >
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 text-sm px-4 py-2 rounded-full border border-primary-light dark:border-cream text-primary-light dark:text-cream"
      >
        {theme === "light" ? "🌙 Dark" : "☀️ Light"}
      </button>

      <div className="flex flex-col items-center gap-[36px] text-center max-w-[1076px]">
        <h1 className="font-black text-[clamp(60px,13vw,187px)] leading-none text-primary-light dark:text-accent-dark">
          CALIBRATE
        </h1>
        <p className="font-black text-[clamp(20px,3.3vw,48px)] text-primary-light dark:text-accent-dark">
          Your AI-Powered CV analyser
        </p>

        <div className="flex flex-col items-center gap-[10px] w-[350px] mt-6">
          <button
            onClick={() => router.push("/signup")}
            className="bg-texture-sidebar flex items-center gap-6 px-9 py-3 rounded-[32px] hover:brightness-90 transition-all"
          >
            <span className="font-black text-cream text-[36px]">
              Get Started
            </span>
            <span className="text-cream text-2xl">→</span>
          </button>

          <p className="font-semibold text-[22px] text-black dark:text-cream">
            Already have an account?{" "}
            <button
              onClick={() => router.push("/login")}
              className="underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}