"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";

/* ---- Icônes auto-contenues ---- */

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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.2 14.7 2.2 12 2.2 6.9 2.2 2.8 6.4 2.8 12s4.1 9.8 9.2 9.8c5.3 0 8.9-3.7 8.9-9 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-1.03-.01-1.87-2.78.51-3.5-.7-3.72-1.34-.13-.33-.68-1.35-1.16-1.63-.4-.22-.97-.75-.01-.77.9-.01 1.55.85 1.76 1.2 1.03 1.76 2.68 1.26 3.33.96.1-.76.4-1.26.73-1.55-2.55-.3-5.23-1.32-5.23-5.85 0-1.29.44-2.35 1.16-3.18-.12-.3-.5-1.51.11-3.15 0 0 .95-.31 3.12 1.22a10.6 10.6 0 015.68 0c2.17-1.53 3.12-1.22 3.12-1.22.61 1.64.23 2.85.11 3.15.72.83 1.16 1.89 1.16 3.18 0 4.54-2.69 5.55-5.25 5.84.41.37.77 1.09.77 2.2 0 1.59-.01 2.87-.01 3.26 0 .27.18.6.69.49A10.26 10.26 0 0022 12.25C22 6.58 17.52 2 12 2z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: brancher la vraie logique d'authentification
    router.push("/upload_cv");
  };

  return (
    <div className="min-h-screen flex bg-texture-page relative">
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-20 text-sm px-4 py-2 rounded-full border border-primary-light dark:border-cream text-primary-light dark:text-cream"
      >
        {theme === "light" ? "🌙" : "☀️"}
      </button>

      {/* Panneau gauche */}
      <div className="hidden md:flex flex-col justify-center w-1/2 bg-texture-sidebar px-16 py-10 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="font-black text-[clamp(32px,3.2vw,44px)] leading-tight text-cream mb-4">
            WELCOME TO
            <br />
            CALIBRATE!
          </h1>
          <p className="font-medium text-[18px] text-cream/80 mb-10">
            Your AI-Powered CV analyser
          </p>

          <p className="font-semibold text-[16px] text-cream mb-2">
            Don&apos;t have an account?
          </p>
          <button
            onClick={() => router.push("/signup")}
            className="border-2 border-cream text-cream font-bold px-6 py-3 rounded-full hover:bg-cream/10 transition-colors"
          >
            CREATE ACCOUNT
          </button>
        </div>
      </div>

      {/* Panneau droit */}
      <div className="flex flex-1 items-center justify-center px-8 py-10">
        <form
          onSubmit={handleSignIn}
          className="w-full max-w-[400px] flex flex-col gap-5"
        >
          <h2 className="font-black text-[clamp(28px,3vw,36px)] text-title-light dark:text-title-dark text-center mb-4">
            Log in
          </h2>

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

          <a href="#" className="text-sm text-primary-light dark:text-accent-dark self-end underline">
            forgot password?
          </a>

          <button
            type="submit"
            className="bg-primary-light dark:bg-primary-dark text-cream font-bold text-[18px] rounded-full py-3 mt-2 hover:brightness-90 transition-all"
          >
            SIGN IN
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-black/10 dark:bg-cream/10" />
            <span className="text-sm text-black/50 dark:text-cream/50">Or</span>
            <div className="flex-1 h-px bg-black/10 dark:bg-cream/10" />
          </div>

          <button
            type="button"
            className="flex items-center justify-center gap-3 border-2 border-[#e5e5e5] dark:border-cream/20 rounded-full py-3 hover:bg-black/5 dark:hover:bg-cream/5 transition-colors"
          >
            <GoogleIcon className="size-5" />
            <span className="font-semibold text-black dark:text-cream">Continue with Google</span>
          </button>

          <button
            type="button"
            className="flex items-center justify-center gap-3 border-2 border-[#e5e5e5] dark:border-cream/20 rounded-full py-3 hover:bg-black/5 dark:hover:bg-cream/5 transition-colors"
          >
            <GithubIcon className="size-5 text-black dark:text-cream" />
            <span className="font-semibold text-black dark:text-cream">Continue with Github</span>
          </button>
        </form>
      </div>
    </div>
  );
}