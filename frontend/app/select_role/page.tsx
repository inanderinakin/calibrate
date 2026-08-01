"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import AppShell from "@/components/AppShell";
import StepIndicator from "@/components/StepIndicator";
import { session } from "@/lib/session";

const ROLES = [
  {
    id: "backend",
    apiName: "Backend Engineer",
    title: "Backend Developer",
    description: "Build robust server-side applications and APIs.",
    icon: "tabler:code",
  },
  {
    id: "data-scientist",
    apiName: "Data Scientist",
    title: "Data Scientist",
    description: "Analyze data and derive insights to drive decisions.",
    icon: "fluent:data-pie-20-regular",
  },
  {
    id: "ml-engineer",
    apiName: "ML Engineer",
    title: "ML Engineer",
    description: "Build and deploy machine learning models.",
    icon: "mdi:brain",
  },
  {
    id: "full-stack",
    apiName: "Full Stack Developer",
    title: "Full Stack Developer",
    description: "Work across the stack to build end-to-end solutions.",
    icon: "ri:stack-fill",
  },
  {
    id: "frontend",
    apiName: "Frontend Engineer",
    title: "Frontend Developer",
    description: "Create responsive and interactive user interfaces.",
    icon: "game-icons:pc",
  },
  {
    id: "devops",
    apiName: "DevOps",
    title: "DevOps Engineer",
    description: "Automate, deploy and manage secure systems.",
    icon: "mdi:cloud",
  },
  {
    id: "mobile",
    apiName: "Mobile Engineer",
    title: "Mobile Developer",
    description: "Build native and cross-platform mobile applications.",
    icon: "mdi:cellphone",
  },
  {
    id: "qa",
    apiName: "QA Engineer",
    title: "QA Engineer",
    description: "Test, automate and safeguard product quality.",
    icon: "mdi:bug-check",
  },
  {
    id: "software",
    apiName: "Software Developer",
    title: "Software Developer",
    description: "Build and ship software across a broad range of projects.",
    icon: "mdi:laptop",
  },
];

export default function SelectRolePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  function toggleRole(apiName: string) {
    setSelected((current) =>
      current.includes(apiName)
        ? current.filter((r) => r !== apiName)
        : [...current, apiName]
    );
  }

  function handleContinue() {
    if (selected.length === 0) return;
    session.setTargetRoles(selected);
    router.push("/analyse_cv");
  }

  return (
    <AppShell>
      <div className="p-6 md:p-10 lg:p-14 flex flex-col items-center gap-8 max-w-5xl mx-auto text-center">
        <StepIndicator activeStep={2} />

        <h1 className="text-3xl md:text-5xl font-bold text-(--accent-2)">
          Select Your Target Roles
        </h1>
        <p className="text-(--text-primary)">
          Pick every role you&apos;re aiming for — we&apos;ll build one roadmap covering all of them.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full text-left">
          {ROLES.map((role) => {
            const isSelected = selected.includes(role.apiName);
            return (
              <button
                key={role.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleRole(role.apiName)}
                className={`relative rounded-[20px] border-4 p-5 flex items-start gap-4 bg-(--card-bg) transition-colors ${
                  isSelected ? "border-(--accent-bg)" : "border-(--text-secondary)/30"
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-(--hover-bg) flex items-center justify-center shrink-0">
                  <Icon icon={role.icon} className="w-7 h-7 text-(--accent-bg)" />
                </div>
                <div>
                  <p className="font-black text-lg text-(--text-primary)">{role.title}</p>
                  <p className="font-light text-(--text-primary)">{role.description}</p>
                </div>
                {isSelected && (
                  <Icon
                    icon="lets-icons:check-fill"
                    className="absolute top-3 right-3 w-7 h-7 text-(--accent-bg)"
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={selected.length === 0}
          onClick={handleContinue}
          className="bg-(--accent) text-(--on-accent) rounded-[20px] px-10 py-3.5 font-black text-xl flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {selected.length > 1 ? `Continue with ${selected.length} roles` : "Continue"}
          <Icon icon="mdi-light:arrow-up" className="w-6 h-6 rotate-90" />
        </button>

        <div className="flex items-center gap-2 text-(--text-primary)">
          <Icon icon="gala:secure" className="w-6 h-6" />
          <span className="font-black">Your data is secure and private</span>
        </div>
      </div>
    </AppShell>
  );
}
