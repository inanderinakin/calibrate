"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import AppShell from "@/components/AppShell";
import StepIndicator from "@/components/StepIndicator";

const ROLES = [
  {
    id: "backend",
    title: "Backend Developer",
    description: "Build robust server-side applications and APIs.",
    icon: "tabler:code",
  },
  {
    id: "data-scientist",
    title: "Data Scientist",
    description: "Analyze data and derive insights to drive decisions.",
    icon: "fluent:data-pie-20-regular",
  },
  {
    id: "ml-engineer",
    title: "ML Engineer",
    description: "Build and deploy machine learning models.",
    icon: "mdi:brain",
  },
  {
    id: "full-stack",
    title: "Full Stack Developer",
    description: "Work across the stack to build end-to-end solutions.",
    icon: "ri:stack-fill",
  },
  {
    id: "frontend",
    title: "Frontend Developer",
    description: "Create responsive and interactive user interfaces.",
    icon: "game-icons:pc",
  },
  {
    id: "devops",
    title: "DevOps Engineer",
    description: "Automate, deploy and manage secure systems.",
    icon: "mdi:cloud",
  },
];

export default function SelectRolePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <AppShell>
      <div className="p-6 md:p-10 lg:p-14 flex flex-col items-center gap-8 max-w-5xl mx-auto text-center">
        <StepIndicator activeStep={2} />

        <h1 className="text-3xl md:text-5xl font-bold text-[var(--accent-2)]">
          Select Your Target Role
        </h1>
        <p className="text-[var(--text-primary)]">
          Choose the role that best matches your career goal.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full text-left">
          {ROLES.map((role) => {
            const isSelected = selected === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelected(role.id)}
                className={`relative rounded-[20px] border-4 p-5 flex items-start gap-4 bg-[var(--card-bg)] transition-colors ${
                  isSelected ? "border-[var(--accent)]" : "border-[var(--text-secondary)]/30"
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-[var(--hover-bg)] flex items-center justify-center shrink-0">
                  <Icon icon={role.icon} className="w-7 h-7 text-[var(--accent)]" />
                </div>
                <div>
                  <p className="font-black text-lg text-[var(--text-primary)]">{role.title}</p>
                  <p className="font-light text-[var(--text-primary)]">{role.description}</p>
                </div>
                {isSelected && (
                  <Icon
                    icon="lets-icons:check-fill"
                    className="absolute top-3 right-3 w-7 h-7 text-[var(--accent)]"
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!selected}
          onClick={() => router.push("/analyse_cv")}
          className="bg-[var(--accent)] text-[var(--on-accent)] rounded-[20px] px-10 py-3.5 font-black text-xl flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
          <Icon icon="mdi-light:arrow-up" className="w-6 h-6 rotate-90" />
        </button>

        <div className="flex items-center gap-2 text-[var(--text-primary)]">
          <Icon icon="gala:secure" className="w-6 h-6" />
          <span className="font-black">Your data is secure and private</span>
        </div>
      </div>
    </AppShell>
  );
}
