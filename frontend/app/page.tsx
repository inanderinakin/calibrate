import Link from "next/link";
import { Icon } from "@iconify/react";

export default function LandingPage() {
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
          <Link
            href="/upload_cv"
            className="w-full bg-[var(--landing-accent)] text-[var(--on-accent)] rounded-[32px] px-9 py-3 font-black text-2xl md:text-3xl flex items-center justify-center gap-4"
          >
            Get Started
            <Icon icon="mdi-light:arrow-up" className="w-7 h-7 rotate-90" />
          </Link>
          <Link
            href="/login"
            className="font-semibold text-lg text-[var(--landing-accent)]"
          >
            Already have an account? Signin
          </Link>
        </div>
      </div>
    </main>
  );
}
