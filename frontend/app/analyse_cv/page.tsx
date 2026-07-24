"use client";


import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import AppShell from "@/components/AppShell";
import StepIndicator from "@/components/StepIndicator";

const CHECKLIST = [
  { title: "Reading CV", note: "Successfully read your document" },
  { title: "Extracting Skills", note: "Identifying your key skills and experience" },
  { title: "Comparing with job market", note: "Analysing market trends and in-demand skills" },
  { title: "Generating Roadmap", note: "Creating your personalised career roadmap" },
];

export default function AnalyseCvPage() {
  const router = useRouter();
  // TODO: replace this simulated progress with a real status poll/websocket
  // against the backend once the analysis endpoint exists.
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + 4));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const done = progress >= 100;
  const stepsCompleted = Math.floor((progress / 100) * CHECKLIST.length);

  return (
    <AppShell>
      <div className="p-6 md:p-10 lg:p-14 flex flex-col items-center gap-8 max-w-4xl mx-auto text-center">
        <StepIndicator activeStep={3} />

        <h1 className="text-3xl md:text-5xl font-bold text-[var(--accent-2)]">
          {done ? "Analysis Complete !" : "Analyzing your CV ..."}
        </h1>
        <p className="text-[var(--text-primary)] max-w-xl">
          {done
            ? "Your personalised insights are ready."
            : "Our AI is carefully analyzing your CV and preparing your personalised insights."}
        </p>

        {/* Checklist card */}
        <div className="bg-[var(--card-bg)] rounded-[23px] shadow-lg p-8 w-full flex flex-col gap-6 text-left">
          {CHECKLIST.map((item, i) => {
            const isDone = i < stepsCompleted || done;
            const isActive = i === stepsCompleted && !done;
            return (
              <div key={item.title} className="flex items-start gap-4">
                {isDone ? (
                  <Icon icon="lets-icons:check-fill" className="w-9 h-9 text-[var(--accent)] shrink-0" />
                ) : (
                  <Icon
                    icon="cuida:loading-left-outline"
                    className={`w-9 h-9 text-[var(--accent)] shrink-0 ${isActive ? "animate-spin" : "opacity-30"}`}
                  />
                )}
                <div>
                  <p className="font-black text-[var(--text-primary)]">{item.title}</p>
                  <p className="text-sm font-light text-[var(--text-primary)]">{item.note}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress */}
        <div className="w-full flex flex-col items-center gap-4">
          <span className="text-4xl font-black text-[var(--accent)]">{progress} %</span>
          <div className="w-full h-2.5 rounded-full bg-[var(--hover-bg)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {!done && (
            <p className="text-[var(--text-primary)] font-light">this may take a few moments ...</p>
          )}
        </div>

        {/* CTAs — only available once analysis is done */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            type="button"
            disabled={!done}
            onClick={() => router.push("/dashboard")}
            className="bg-[var(--accent)] text-[var(--on-accent)] rounded-[20px] px-8 py-3.5 font-bold text-lg flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue to Dashboard
            <Icon icon="mdi-light:arrow-up" className="w-6 h-6 rotate-90" />
          </button>

          {done && (
            <Link
              href="/profile"
              className="border-2 border-[var(--accent)] text-[var(--accent)] rounded-[20px] px-8 py-3.5 font-bold text-lg flex items-center gap-3"
            >
              Check Profile Settings
              <Icon icon="solar:settings-linear" className="w-6 h-6" />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 text-[var(--text-primary)]">
          <Icon icon="gala:secure" className="w-6 h-6" />
          <span className="font-black">Your data is secure and private</span>
        </div>
      </div>
    </AppShell>
  );
}
