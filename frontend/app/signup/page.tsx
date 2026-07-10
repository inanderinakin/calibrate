"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* ---- Icônes auto-contenues ---- */

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 4.5A2.5 2.5 0 016.5 2H20v18H6.5A2.5 2.5 0 004 17.5v-13z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 17.5A2.5 2.5 0 016.5 15H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11V7a4 4 0 118 0v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showPassword, setShowPassword] = useState(false);
 const [fullName, setFullName] = useState("");
  const [studyField, setStudyField] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: brancher la vraie logique de création de compte
    router.push("/upload_cv");
  };

  return (
    <div data-theme={theme} className="min-h-screen flex bg-texture-page relative">
      <button
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        className="absolute top-6 right-6 z-20 text-sm px-4 py-2 rounded-full border border-primary-light dark:border-cream text-primary-light dark:text-cream"
      >
        {theme === "light" ? "🌙" : "☀️"}
      </button>

      {/* Panneau gauche */}
      <div className="hidden md:flex flex-col items-start justify-center h-screen w-1/2 bg-texture-sidebar px-16 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="font-black text-[clamp(28px,2.8vw,40px)] leading-tight text-cream mb-4">
            START YOUR
            <br />
            JOURNEY WITH
            <br />
            CALIBRATE !
          </h1>
          <p className="font-medium text-[18px] text-cream/80 mb-10">
            Your AI-Powered CV analyser
          </p>

          <p className="font-semibold text-[16px] text-cream mb-2">
            Already have an account?
          </p>
          <button
            onClick={() => router.push("/login")}
            className="border-2 border-cream text-cream font-bold px-6 py-3 rounded-full hover:bg-cream/10 transition-colors"
          >
            SIGN IN
          </button>
        </div>
      </div>

      {/* Panneau droit */}
      <div className="flex flex-1 items-center justify-center px-8 py-10">
        <form
          onSubmit={handleCreateAccount}
          className="w-full max-w-[440px] flex flex-col gap-5"
        >
          <h2 className="font-black text-[clamp(28px,3vw,36px)] text-title-light dark:text-title-dark text-center mb-4">
            Sign Up
          </h2>

  <div className="flex flex-col gap-1">
  <label className="text-sm font-semibold text-black dark:text-cream">
    Full Name
  </label>
  <div className="flex items-center gap-2 border-2 border-[#d8a7a7] dark:border-sidebar-dark rounded-xl px-4 py-3">
    <UserIcon className="size-5 text-primary-light dark:text-accent-dark" />
    <input
      type="text"
      required
      value={fullName}
      onChange={(e) => setFullName(e.target.value)}
      className="flex-1 bg-transparent outline-none text-black dark:text-cream"
    />
  </div>
</div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-black dark:text-cream">
              Study Field
            </label>
            <div className="flex items-center gap-2 border-2 border-[#d8a7a7] dark:border-sidebar-dark rounded-xl px-4 py-3">
              <BookIcon className="size-5 text-primary-light dark:text-accent-dark" />
              <input
                type="text"
                required
                value={studyField}
                onChange={(e) => setStudyField(e.target.value)}
                placeholder="e.g. Computer Science"
                className="flex-1 bg-transparent outline-none text-black dark:text-cream placeholder:text-black/40 dark:placeholder:text-cream/40"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-black dark:text-cream">
              Your email
            </label>
            <div className="flex items-center gap-2 border-2 border-[#d8a7a7] dark:border-sidebar-dark rounded-xl px-4 py-3">
              <MailIcon className="size-5 text-primary-light dark:text-accent-dark" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 bg-transparent outline-none text-black dark:text-cream placeholder:text-black/40 dark:placeholder:text-cream/40"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-black dark:text-cream">
              Your Password
            </label>
            <div className="flex items-center gap-2 border-2 border-[#d8a7a7] dark:border-sidebar-dark rounded-xl px-4 py-3">
              <LockIcon className="size-5 text-primary-light dark:text-accent-dark" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="flex-1 bg-transparent outline-none text-black dark:text-cream placeholder:text-black/40 dark:placeholder:text-cream/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-primary-light dark:text-accent-dark"
              >
                <EyeIcon className="size-5" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="bg-primary-light dark:bg-primary-dark text-cream font-bold text-[18px] rounded-full py-3 mt-2 hover:brightness-90 transition-all"
          >
            CREATE ACCOUNT
          </button>
        </form>
      </div>
    </div>
  );
}
