"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { session } from "@/lib/session";
import type { GapResult } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [gaps, setGaps] = useState<GapResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setGaps(session.getGaps());
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <AppShell>
        <div className="p-6 md:p-10 lg:p-14" />
      </AppShell>
    );
  }

  if (!gaps) {
    return (
      <AppShell>
        <div className="p-6 md:p-10 lg:p-14 flex flex-col items-start gap-4">
          <h1 className="text-3xl md:text-5xl font-bold text-(--text-primary)">
            Nothing to show yet
          </h1>
          <p className="text-(--text-secondary) text-lg">
            Upload your CV and pick your target roles to see how you match the market.
          </p>
          <Link href="/upload_cv" className="bg-(--accent) text-(--on-accent) rounded-[20px] px-8 py-3.5 font-bold text-lg">
            Upload your CV
          </Link>
        </div>
      </AppShell>
    );
  }

  const roles = gaps.target_roles;

  let matched = 0;
  let total = 0;
  for (const role of roles) {
    const data = gaps.matched_data[role];
    if (data) {
      matched += data.matched_demanded;
      total += data.total_demanded;
    }
  }
  const matchPercent = total === 0 ? 0 : Math.round((matched / total) * 100);

  const demandBySkill = new Map<string, number>();
  for (const role of roles) {
    for (const gap of gaps.gaps[role] ?? []) {
      const percent = Math.round(gap.demand_percentage * 100);
      demandBySkill.set(gap.skill, Math.max(demandBySkill.get(gap.skill) ?? 0, percent));
    }
  }
  const missingSkills = [...demandBySkill.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <AppShell>
      <div className="p-6 md:p-10 lg:p-14 flex flex-col gap-6">
        <header>
          <h1 className="text-3xl md:text-5xl font-bold text-(--text-primary)">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""} !
          </h1>
          <p className="text-(--text-secondary) mt-2 text-lg">
            Here&apos;s how you match {roles.join(", ")}.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-(--card-bg) rounded-[30px] shadow-lg p-6 flex flex-col items-center justify-center text-center gap-2">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--hover-bg)" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--accent-2)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(matchPercent / 100) * 264} 264`}
                />
              </svg>
              <span className="text-3xl font-black text-(--text-primary)">
                {matchPercent}%
              </span>
            </div>
            <p className="font-black text-(--accent-2) text-xl">MATCH</p>
            <p className="font-black text-(--text-primary)">
              {matchPercent >= 60
                ? "Your profile is a strong match!"
                : "There's room to grow here."}
            </p>
            <p className="text-sm text-(--text-secondary)">
              You have {matched} of the {total} skills these roles ask for.
            </p>
            {roles.length > 1 && (
              <div className="mt-2 flex flex-col gap-1 w-full">
                {roles.map((role) => {
                  const data = gaps.matched_data[role];
                  if (!data) return null;
                  return (
                    <div key={role} className="flex justify-between text-sm text-(--text-secondary)">
                      <span>{role}</span>
                      <span className="font-bold">{Math.round(data.ratio * 100)}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-(--card-bg) rounded-[30px] shadow-lg p-6 lg:col-span-2 flex flex-col gap-5">
            <h2 className="text-2xl font-black text-(--text-primary)">Missing Skills !</h2>
            {missingSkills.length === 0 ? (
              <p className="text-(--text-muted)">
                No gaps found! Your CV covers everything these roles ask for.
              </p>
            ) : (
              missingSkills.map(([skill, percent]) => (
                <div key={skill} className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-(--text-primary) mb-1">{skill}</p>
                    <div className="h-2.5 rounded-full bg-(--hover-bg) overflow-hidden">
                      <div
                        className="h-full rounded-full bg-(--accent-2)"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-black text-(--text-primary) w-14 text-right">
                    {percent}%
                  </span>
                </div>
              ))
            )}
            <p className="text-xs text-(--text-muted)">
              Percentages show how often each skill appears in job postings for these roles.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-(--card-bg) rounded-[30px] shadow-lg p-6 lg:col-span-2 min-h-70 flex items-center justify-center">
            <p className="text-(--text-secondary)">Market trends chart</p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-(--card-bg) rounded-[25px] shadow-lg p-5 flex flex-col gap-3">
              <h2 className="font-black text-(--text-primary)">Profile Summary</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-(--accent) rounded-[18px] p-3 flex flex-col gap-1">
                  <Icon icon="carbon:user-role" className="w-8 h-8 text-(--on-accent)" />
                  <span className="text-sm font-black text-(--on-accent)">Current Role</span>
                  <span className="text-xs font-light text-(--on-accent)">
                    {user?.studyField ?? "Not set"}
                  </span>
                </div>
                <div className="bg-(--accent) rounded-[18px] p-3 flex flex-col gap-1">
                  <Icon icon="clarity:email-line" className="w-8 h-8 text-(--on-accent)" />
                  <span className="text-sm font-black text-(--on-accent)">E-mail</span>
                  <a
                    href={`mailto:${user?.email ?? ""}`}
                    className="text-xs font-light text-(--on-accent) underline truncate"
                  >
                    {user?.email ?? "—"}
                  </a>
                </div>
              </div>
              <Link
                href="/profile"
                className="border-2 border-(--accent-bg) text-(--accent-bg) rounded-[18px] py-2.5 text-center font-black flex items-center justify-center gap-2"
              >
                View full profile
                <Icon icon="weui:arrow-outlined" className="w-4 h-4 rotate-90" />
              </Link>
            </div>

            <Link
              href="/roadmap"
              className="bg-(--accent) rounded-[20px] shadow-lg px-6 py-5 flex items-center justify-between"
            >
              <span className="font-black text-(--on-accent) text-xl">Get your Roadmap !</span>
              <Icon icon="mdi-light:arrow-up" className="w-9 h-9 rotate-90 text-(--on-accent)" />
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
