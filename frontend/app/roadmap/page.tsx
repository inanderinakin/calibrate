"use client";

import { Icon } from "@iconify/react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

import localJson from './example_result.json'

interface Resource {
  title: string,
  url: string,
  type: "documentation" | "video" | "course",
  language: "tr" | "en", 
}

interface Recommendation {
  rank: number,
  skill: string,
  esco_category: string,
  reason: string,
  trend: "Emerging" | "Stable" | "Fading",
  closest_cv_skill: string | null,
  resources: Resource[],
}

interface Report {
  target_roles: string[],
  summary: string,
  recommendations: Recommendation[]
}

// Static placeholders for data that will come from the backend later.
const MATCH_PERCENT = 68;
const MISSING_SKILLS: Recommendation = {
  rank: 2,
  skill: "Docker",
  esco_category: "containerization",
  reason: "Docker appears in approximately 45% of Data Scientist job postings. While your existing Kubernetes experience gives you a solid containerization foundation that partially bridges this gap, formally adding Docker to your skillset would strengthen your profile further. Unfortunately, no learning resources are available for Docker at this time \u2014 please check back later.",
  trend: "Stable",
  closest_cv_skill: "Kubernetes",
  resources: []
}
const FINAL_REPORT: Report = JSON.parse(localJson)

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <div className="p-6 md:p-10 lg:p-14 flex flex-col gap-6">
        <header>
          <h1 className="text-3xl md:text-5xl font-bold text-[var(--text-primary)]">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""} !
          </h1>
          <p className="text-[var(--text-secondary)] mt-2 text-lg">
            Here&apos;s your professional overview for today.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Missing Skills */}
          <div className="bg-[var(--card-bg)] rounded-[30px] shadow-lg p-6 lg:col-span-2 flex flex-col gap-5">
            <h2 className="text-2xl font-black text-[var(--text-primary)]">Missing Skills !</h2>
            {localJson.map((skill) => (
              <div key={skill.name} className="flex items-center gap-4">
                <Icon icon={skill.icon} className="w-9 h-9 shrink-0" />
                <div className="flex-1">
                  <p className="text-[var(--text-primary)] mb-1">{skill.name}</p>
                  <div className="h-2.5 rounded-full bg-[var(--hover-bg)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent-2)]"
                      style={{ width: `${skill.demand}%` }}
                    />
                  </div>
                </div>
                <span className="font-black text-[var(--text-primary)] w-14 text-right">
                  {skill.demand}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
