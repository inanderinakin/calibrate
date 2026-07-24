"use client";

import { Icon } from "@iconify/react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";

// Static placeholders for data that will come from the backend later.
const MATCH_PERCENT = 68;
const MISSING_SKILLS = [
  { name: "Docker", icon: "logos:docker-icon", demand: 66 },
  { name: "Fast API", icon: "skill-icons:fastapi", demand: 74 },
  { name: "Java Script", icon: "fa7-brands:node-js", demand: 63 },
];

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
          {/* Match Profile */}
          <div className="bg-[var(--card-bg)] rounded-[30px] shadow-lg p-6 flex flex-col items-center justify-center text-center gap-2">
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
                  strokeDasharray={`${(MATCH_PERCENT / 100) * 264} 264`}
                />
              </svg>
              <span className="text-3xl font-black text-[var(--text-primary)]">
                {MATCH_PERCENT}%
              </span>
            </div>
            <p className="font-black text-[var(--accent-2)] text-xl">MATCH</p>
            <p className="font-black text-[var(--text-primary)]">Your profile is a strong match!</p>
            <p className="text-sm text-[var(--text-secondary)]">
              here is what you should work on to increase your chances
            </p>
          </div>

          {/* Missing Skills */}
          <div className="bg-[var(--card-bg)] rounded-[30px] shadow-lg p-6 lg:col-span-2 flex flex-col gap-5">
            <h2 className="text-2xl font-black text-[var(--text-primary)]">Missing Skills !</h2>
            {MISSING_SKILLS.map((skill) => (
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Market trends chart placeholder */}
          <div className="bg-[var(--card-bg)] rounded-[30px] shadow-lg p-6 lg:col-span-2 min-h-[280px] flex items-center justify-center">
            <p className="text-[var(--text-secondary)]">Market trends chart</p>
          </div>

          <div className="flex flex-col gap-6">
            {/* Profile summary */}
            <div className="bg-[var(--card-bg)] rounded-[25px] shadow-lg p-5 flex flex-col gap-3">
              <h2 className="font-black text-[var(--text-primary)]">Profile Summary</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--accent)] rounded-[18px] p-3 flex flex-col gap-1">
                  <Icon icon="carbon:user-role" className="w-8 h-8 text-[var(--on-accent)]" />
                  <span className="text-sm font-black text-[var(--on-accent)]">Current Role</span>
                  <span className="text-xs font-light text-[var(--on-accent)]">
                    {user?.studyField ?? "Not set"}
                  </span>
                </div>
                <div className="bg-[var(--accent)] rounded-[18px] p-3 flex flex-col gap-1">
                  <Icon icon="clarity:email-line" className="w-8 h-8 text-[var(--on-accent)]" />
                  <span className="text-sm font-black text-[var(--on-accent)]">E-mail</span>
                  <a
                    href={`mailto:${user?.email ?? ""}`}
                    className="text-xs font-light text-[var(--on-accent)] underline truncate"
                  >
                    {user?.email ?? "—"}
                  </a>
                </div>
              </div>
              <a
                href="/profile"
                className="border-2 border-[var(--accent)] text-[var(--accent)] rounded-[18px] py-2.5 text-center font-black flex items-center justify-center gap-2"
              >
                View full profile
                <Icon icon="weui:arrow-outlined" className="w-4 h-4 rotate-90" />
              </a>
            </div>

            {/* Get your Roadmap banner */}
            <a
              href="/roadmap"
              className="bg-[var(--accent)] rounded-[20px] shadow-lg px-6 py-5 flex items-center justify-between"
            >
              <span className="font-black text-[var(--on-accent)] text-xl">Get your Roadmap !</span>
              <Icon icon="mdi-light:arrow-up" className="w-9 h-9 rotate-90 text-[var(--on-accent)]" />
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
