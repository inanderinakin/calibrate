"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import AppShell from "@/components/AppShell";
import TrendingSkillsChart from "@/components/TrendingSkillsChart";
import { useAuth } from "@/contexts/AuthContext";
import { API_URL } from "@/lib/api";
import { session } from "@/lib/session";
import type { GapResult, TrendsPayload } from "@/lib/types";
import { getDisplaySkillName } from "@/lib/escoMapper";

type Skill = {
  name: string;
  missing: number;
  icon: string;
};

const skillIcons: Record<string, string> = {
  Python: "logos:python",
  Java: "logos:java",
  JavaScript: "logos:javascript",
  TypeScript: "logos:typescript-icon",
  "C#": "logos:c-sharp",
  "C++": "logos:c-plusplus",
  Golang: "logos:go",
  Rust: "logos:rust",
  PHP: "logos:php",
  Ruby: "logos:ruby",
  Kotlin: "logos:kotlin-icon",
  Swift: "logos:swift",
  Scala: "logos:scala",
  React: "logos:react",
  "React Native": "logos:react",
  Angular: "material-icon-theme:angular",
  Vue: "logos:vue",
  "Next.js": "logos:nextjs-icon",
  ".NET": "logos:dotnet",
  Spring: "logos:spring-icon",
  Django: "logos:django-icon",
  Flask: "logos:flask",
  FastAPI: "logos:fastapi-icon",
  "Node.js": "logos:nodejs-icon",
  Laravel: "logos:laravel",
  SQL: "vscode-icons:file-type-sql",
  PostgreSQL: "logos:postgresql",
  MySQL: "logos:mysql",
  MongoDB: "logos:mongodb-icon",
  Redis: "logos:redis",
  Elasticsearch: "logos:elasticsearch",
  Kafka: "logos:kafka-icon",
  Spark: "logos:apache-spark",
  Pandas: "logos:pandas-icon",
  TensorFlow: "logos:tensorflow",
  PyTorch: "logos:pytorch-icon",
  "scikit-learn": "devicon:scikitlearn",
  LLM: "noto:brain",
  NLP: "noto:speech-balloon",
  AWS: "logos:aws",
  Azure: "devicon:azure",
  GCP: "logos:google-cloud",
  Docker: "logos:docker-icon",
  Kubernetes: "devicon:kubernetes",
  Terraform: "logos:terraform-icon",
  Jenkins: "logos:jenkins",
  Ansible: "logos:ansible",
  "CI/CD": "logos:github-actions",
  Git: "logos:git-icon",
  GitHub: "mdi:github",
  Linux: "devicon:linux",
  Grafana: "logos:grafana",
  Prometheus: "logos:prometheus",
  Android: "logos:android-icon",
  iOS: "logos:apple-app-store",
  Flutter: "logos:flutter",
  Selenium: "logos:selenium",
  Cypress: "logos:cypress-icon",
  JUnit: "devicon:junit",
  Postman: "logos:postman-icon",
  DevOps: "selfhst:azure-devops"
};

function getSkillIcon(skill: string) {
  return skillIcons[skill] ?? "mdi:code-tags";
}

function getRoadmapData(selected: Skill | null) {
  if (selected && selected.missing >= 70) {
    return { difficulty: "Advanced", modules: 20, projects: 5, duration: "6–8 weeks" };
  }

  if (!selected || selected.missing >= 50) {
    return { difficulty: "Intermediate", modules: 18, projects: 4, duration: "4–6 weeks" };
  }

  return { difficulty: "Beginner", modules: 12, projects: 3, duration: "3–4 weeks" };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [gaps, setGaps] = useState<GapResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [trends, setTrends] = useState<TrendsPayload | null>(null);
  const [trendsFailed, setTrendsFailed] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  useEffect(() => {
    setGaps(session.getGaps());
    setLoaded(true);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/trends`)
      .then((res) => res.json())
      .then((data) => setTrends(data))
      .catch(() => setTrendsFailed(true));
  }, []);

  if (!loaded) {
    return (
      <AppShell>
        <div className="page-texture min-h-screen p-6 md:p-10 lg:p-14" />
      </AppShell>
    );
  }

  if (!gaps) {
    return (
      <AppShell>
        <main className="page-texture min-h-screen px-6 py-10 md:px-10 lg:px-14">
          <div className="mx-auto flex max-w-3xl flex-col items-start gap-5 rounded-[30px] bg-(--card-bg) p-8 shadow-lg">
            <Icon
              icon="mdi:file-search-outline"
              className="h-14 w-14 text-(--accent-2)"
            />

            <h1 className="text-3xl font-black text-(--text-primary) md:text-5xl">
              Nothing to show yet
            </h1>

            <p className="text-lg text-[var(--text-secondary)]">
              Upload your CV and pick your target roles to see how you match
              the market.
            </p>

            <Link
              href="/upload_cv"
              className="rounded-[20px] bg-[var(--accent)] px-8 py-3.5 text-lg font-bold text-[var(--on-accent)]"
            >
              Upload your CV
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  const roles = gaps.target_roles;

  /* ---------------- MATCH CALCULATION ---------------- */

  let matched = 0;
  let total = 0;

  for (const role of roles) {
    const data = gaps.matched_data[role];

    if (data) {
      matched += data.matched_demanded;
      total += data.total_demanded;
    }
  }

  const matchPercent =
    total === 0 ? 0 : Math.round((matched / total) * 100);

  /* ---------------- MISSING SKILLS ---------------- */

  const demandBySkill = new Map<string, number>();

  for (const role of roles) {
    for (const gap of gaps.gaps[role] ?? []) {
      const percent = Math.round(gap.demand_percentage * 100);

      demandBySkill.set(
        gap.skill,
        Math.max(demandBySkill.get(gap.skill) ?? 0, percent)
      );
    }
  }

  const missingSkills: Skill[] = [...demandBySkill.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([escoSkill, missing]) => {
      const name = getDisplaySkillName(escoSkill);
      return { name, missing, icon: getSkillIcon(name) };
    });

  const missingSkillNames = [...demandBySkill.keys()].map(getDisplaySkillName);

  const selected =
    missingSkills.find((skill) => skill.name === selectedSkill) ??
    missingSkills[0] ??
    null;

  /* ---------------- SELECTED ROLE MATCH ---------------- */

  const selectedRoleData =
    roles.length === 1 ? gaps.matched_data[roles[0]] : null;

  /* ---------------- ROADMAP DATA ---------------- */

  const roadmapData = getRoadmapData(selected);

  /* ---------------- UI ---------------- */

  return (
    <AppShell>
      <main className="page-texture min-h-screen overflow-x-hidden px-5 py-6 md:px-8 md:py-8 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-[1500px]">

          {/* HEADER */}
          <header className="mb-5">
            <h1 className="text-4xl font-black tracking-[-0.04em] text-(--text-primary) md:text-5xl lg:text-6xl">
              Welcome back
              {user?.firstName ? `, ${user.firstName}` : ""} !
            </h1>

            <p className="mt-1 text-lg text-(--text-muted) md:text-xl">
              Here&apos;s how you match{" "}
              {roles.length > 0 ? roles.join(", ") : "your target role"}.
            </p>
          </header>

          {/* TOP SECTION */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.3fr]">

            {/* MATCH CARD */}
            <div className="rounded-[20px] border border-black/5 bg-[var(--card-bg)] p-7 shadow-[0_5px_20px_rgba(0,0,0,0.08)]">
              <div className="flex h-full flex-col justify-center gap-5 md:flex-row md:items-center md:gap-8">

                {/* MATCH CIRCLE */}
                <div className="relative mx-auto flex h-[220px] w-[220px] shrink-0 items-center justify-center rounded-full bg-[#dedede]">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(
                        var(--accent-2) ${matchPercent}%,
                        #dedede ${matchPercent}%
                      )`,
                    }}
                  />

                  <div className="absolute inset-[13px] flex flex-col items-center justify-center rounded-full bg-[var(--card-bg)]">
                    <span className="text-5xl font-black text-[var(--text-primary)]">
                      {matchPercent}%
                    </span>

                    <span className="mt-1 text-2xl font-black text-[var(--accent-2)]">
                      MATCH
                    </span>
                  </div>
                </div>

                {/* MATCH INFO */}
                <div className="flex flex-col justify-center">
                  <h2 className="text-2xl font-black text-[var(--text-primary)]">
                    {matchPercent >= 60
                      ? "Strong Match"
                      : "Room to Grow"}
                  </h2>

                  <p className="mt-2 max-w-[250px] text-lg leading-snug text-[var(--text-secondary)]">
                    Your profile matches
                    <br />
                    {matchPercent}% of the selected role.
                  </p>

                  <div className="mt-4 flex w-fit items-center gap-2 rounded-xl bg-[var(--hover-bg)] px-3 py-2 text-sm font-semibold text-[var(--accent-2)]">
                    <Icon
                      icon={
                        matchPercent >= 60
                          ? "mdi:trending-up"
                          : "mdi:trending-down"
                      }
                      className="h-5 w-5"
                    />

                    {matchPercent >= 60
                      ? "You’re on the right track!"
                      : "There’s room to grow."}
                  </div>

                  <p className="mt-3 text-xs text-[var(--text-muted)]">
                    You have {matched} of the {total} demanded skills.
                  </p>

                  {/* ROLE BREAKDOWN */}
                  {roles.length > 1 && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      {roles.map((role) => {
                        const data = gaps.matched_data[role];

                        if (!data) return null;

                        return (
                          <div
                            key={role}
                            className="flex justify-between gap-5 text-sm text-[var(--text-secondary)]"
                          >
                            <span>{role}</span>

                            <span className="font-bold">
                              {Math.round(data.ratio * 100)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* MISSING SKILLS */}
            <div className="rounded-[20px] border border-black/5 bg-[var(--card-bg)] p-6 shadow-[0_5px_20px_rgba(0,0,0,0.08)]">

              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon
                    icon="mdi:target"
                    className="h-9 w-9 text-[var(--accent-2)]"
                  />

                  <h2 className="text-2xl font-black text-[var(--text-primary)]">
                    Missing Skills
                  </h2>
                </div>

                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-black/15 px-4 py-2 text-sm font-medium text-[var(--accent-2)]"
                >
                  Why these skills
                  <Icon
                    icon="mdi:information-outline"
                    className="h-5 w-5"
                  />
                </button>
              </div>

              {missingSkills.length === 0 ? (
                <p className="text-[var(--text-muted)]">
                  No gaps found! Your CV covers everything these roles ask
                  for.
                </p>
              ) : (
                <div className="space-y-4">
                  {missingSkills.map((skill) => (
                    <button
                      key={skill.name}
                      type="button"
                      onClick={() => setSelectedSkill(skill.name)}
                      className={`grid w-full grid-cols-[58px_1fr_65px] items-center gap-3 rounded-xl text-left transition ${
                        selectedSkill === skill.name
                          ? "scale-[1.01]"
                          : ""
                      }`}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1f1f1]">
                        <Icon
                          icon={skill.icon}
                          className="h-8 w-8"
                        />
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-base font-bold text-[var(--text-primary)]">
                            {skill.name}
                          </span>
                        </div>

                        <div className="h-2 rounded-full bg-[#e4e4e4]">
                          <div
                            className="h-full rounded-full bg-[var(--accent-2)]"
                            style={{
                              width: `${skill.missing}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xl font-black text-[var(--text-primary)]">
                          {skill.missing}%
                        </span>

                        <p className="text-xs text-[var(--text-muted)]">
                          Missing
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-5 text-xs text-[var(--text-muted)]">
                Percentages show how often each skill appears in job postings
                for these roles.
              </p>
            </div>
          </section>

          {/* LEARNING FOCUS */}
          <section className="mt-5 rounded-[20px] border border-black/5 bg-[var(--card-bg)] p-6 shadow-[0_5px_20px_rgba(0,0,0,0.08)]">

            <div className="mb-5 flex items-start gap-3">
              <Icon
                icon="mdi:target"
                className="mt-0.5 h-9 w-9 shrink-0 text-[var(--accent-2)]"
              />

              <div>
                <h2 className="text-2xl font-black text-[var(--text-primary)]">
                  Choose your learning focus
                </h2>

                <p className="mt-1 text-base text-[var(--text-secondary)]">
                  Select one skill to generate a personalized roadmap.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

              {/* SKILLS */}
              {missingSkills.map((skill) => {
                const isSelected = selectedSkill === skill.name;

                return (
                  <button
                    key={skill.name}
                    type="button"
                    onClick={() => setSelectedSkill(skill.name)}
                    className={`relative rounded-[16px] border-2 p-4 text-left transition ${
                      isSelected
                        ? "border-[var(--accent-2)]"
                        : "border-black/10 hover:border-[var(--accent-2)]/50"
                    }`}
                  >
                    <div
                      className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                        isSelected
                          ? "border-[var(--accent-2)]"
                          : "border-black/30"
                      }`}
                    >
                      {isSelected && (
                        <div className="h-3 w-3 rounded-full bg-[var(--accent-2)]" />
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#f1f1f1]">
                        <Icon
                          icon={skill.icon}
                          className="h-9 w-9"
                        />
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-[var(--text-primary)]">
                          {skill.name}
                        </h3>

                        <p className="text-sm text-[var(--text-muted)]">
                          Missing Level
                        </p>

                        <p className="text-base font-black text-[var(--accent-2)]">
                          {skill.missing}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-1.5 rounded-full bg-[#e4e4e4]">
                      <div
                        className="h-full rounded-full bg-[var(--accent-2)]"
                        style={{
                          width: `${skill.missing}%`,
                        }}
                      />
                    </div>
                  </button>
                );
              })}

              {/* COMPLETE ROADMAP */}
              <button
                type="button"
                onClick={() => setSelectedSkill(null)}
                className={`relative rounded-[16px] border-2 border-dashed p-4 text-left transition ${
                  selectedSkill === null
                    ? "border-[var(--accent-2)]"
                    : "border-black/15 hover:border-[var(--accent-2)]/50"
                }`}
              >
                <div
                  className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    selectedSkill === null
                      ? "border-[var(--accent-2)]"
                      : "border-black/30"
                  }`}
                >
                  {selectedSkill === null && (
                    <div className="h-3 w-3 rounded-full bg-[var(--accent-2)]" />
                  )}
                </div>

                <Icon
                  icon="mdi:map-outline"
                  className="h-10 w-10 text-[var(--accent-2)]"
                />

                <h3 className="mt-2 text-lg font-black leading-tight text-[var(--text-primary)]">
                  Complete Career
                  <br />
                  Roadmap
                </h3>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  All missing skills
                  <br />
                  in one plan
                </p>
              </button>
            </div>
          </section>

          {/* MARKET TRENDS */}
          <section className="mt-5 rounded-[20px] border border-black/5 bg-[var(--card-bg)] p-6 shadow-[0_5px_20px_rgba(0,0,0,0.08)]">

            <div className="mb-5 flex items-center gap-2">
              <h2 className="text-2xl font-black text-[var(--text-primary)]">
                Market Trends
              </h2>
              <span title="Weekly share of job postings mentioning each skill, averaged across job boards.">
                <Icon
                  icon="mdi:information-outline"
                  className="h-5 w-5 text-[var(--text-muted)]"
                />
              </span>
            </div>

            {trendsFailed ? (
              <p className="text-[var(--text-secondary)]">
                Market trends are unavailable right now.
              </p>
            ) : (
              <TrendingSkillsChart data={trends} missing={missingSkillNames} />
            )}
          </section>

          {/* ROADMAP PREVIEW */}
          <section className="mt-5 rounded-[20px] border border-black/5 bg-[var(--card-bg)] p-6 shadow-[0_5px_20px_rgba(0,0,0,0.08)]">

            <div className="mb-5 flex items-center gap-3">
              <Icon
                icon="mdi:chart-box-outline"
                className="h-9 w-9 text-[var(--accent-2)]"
              />

              <h2 className="text-xl font-black text-[var(--text-primary)]">
                Roadmap preview for{" "}
                {selected?.name ?? "Complete Career"}
              </h2>
            </div>

            <div className="grid grid-cols-1 divide-y divide-black/10 md:grid-cols-4 md:divide-x md:divide-y-0">

              {/* DIFFICULTY */}
              <div className="flex items-center gap-4 px-4 py-2 md:px-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0]">
                  <Icon
                    icon="mdi:chart-bar"
                    className="h-7 w-7 text-[var(--accent-2)]"
                  />
                </div>

                <div>
                  <p className="text-sm text-[var(--text-muted)]">
                    Difficulty
                  </p>

                  <p className="text-base font-black text-[var(--text-primary)]">
                    {roadmapData.difficulty}
                  </p>
                </div>
              </div>

              {/* MODULES */}
              <div className="flex items-center gap-4 px-4 py-2 md:px-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0]">
                  <Icon
                    icon="mdi:book-open-outline"
                    className="h-7 w-7 text-[var(--accent-2)]"
                  />
                </div>

                <div>
                  <p className="text-sm text-[var(--text-muted)]">
                    Modules
                  </p>

                  <p className="text-base font-black text-[var(--text-primary)]">
                    {roadmapData.modules}
                  </p>
                </div>
              </div>

              {/* PROJECTS */}
              <div className="flex items-center gap-4 px-4 py-2 md:px-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0]">
                  <Icon
                    icon="mdi:laptop"
                    className="h-7 w-7 text-[var(--accent-2)]"
                  />
                </div>

                <div>
                  <p className="text-sm text-[var(--text-muted)]">
                    Projects
                  </p>

                  <p className="text-base font-black text-[var(--text-primary)]">
                    {roadmapData.projects}
                  </p>
                </div>
              </div>

              {/* DURATION */}
              <div className="flex items-center gap-4 px-4 py-2 md:px-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0]">
                  <Icon
                    icon="mdi:clock-outline"
                    className="h-7 w-7 text-[var(--accent-2)]"
                  />
                </div>

                <div>
                  <p className="text-sm text-[var(--text-muted)]">
                    Estimated duration
                  </p>

                  <p className="text-base font-black text-[var(--text-primary)]">
                    {roadmapData.duration}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* PROFILE + ROADMAP */}
          <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">

            {/* PROFILE SUMMARY */}
            <div className="rounded-[20px] bg-[var(--card-bg)] p-5 shadow-[0_5px_20px_rgba(0,0,0,0.08)] lg:col-span-2">

              <div className="mb-4 flex items-center gap-3">
                <Icon
                  icon="mdi:account-circle-outline"
                  className="h-8 w-8 text-[var(--accent-2)]"
                />

                <h2 className="text-xl font-black text-[var(--text-primary)]">
                  Profile Summary
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                {/* CURRENT ROLE */}
                <div className="flex flex-col gap-1 rounded-[18px] bg-[var(--accent)] p-4">
                  <Icon
                    icon="carbon:user-role"
                    className="h-8 w-8 text-[var(--on-accent)]"
                  />

                  <span className="text-sm font-black text-[var(--on-accent)]">
                    Current Role
                  </span>

                  <span className="text-xs font-light text-[var(--on-accent)]">
                    {user?.studyField ?? "Not set"}
                  </span>
                </div>

                {/* EMAIL */}
                <div className="flex flex-col gap-1 rounded-[18px] bg-[var(--accent)] p-4">
                  <Icon
                    icon="clarity:email-line"
                    className="h-8 w-8 text-[var(--on-accent)]"
                  />

                  <span className="text-sm font-black text-[var(--on-accent)]">
                    E-mail
                  </span>

                  <a
                    href={`mailto:${user?.email ?? ""}`}
                    className="truncate text-xs font-light text-[var(--on-accent)] underline"
                  >
                    {user?.email ?? "—"}
                  </a>
                </div>
              </div>

              <Link
                href="/profile"
                className="mt-4 flex items-center justify-center gap-2 rounded-[18px] border-2 border-[var(--accent-bg)] py-2.5 text-center font-black text-[var(--accent-bg)]"
              >
                View full profile

                <Icon
                  icon="weui:arrow-outlined"
                  className="h-4 w-4 rotate-90"
                />
              </Link>
            </div>

            {/* QUICK ROADMAP */}
            <Link
              href="/roadmap"
              className="flex items-center justify-between rounded-[20px] bg-[var(--accent)] px-6 py-5 shadow-lg transition hover:scale-[1.01]"
            >
              <span className="text-xl font-black text-[var(--on-accent)]">
                Get your Roadmap !
              </span>

              <Icon
                icon="mdi-light:arrow-up"
                className="h-9 w-9 rotate-90 text-[var(--on-accent)]"
              />
            </Link>
          </section>

          {/* GENERATE BUTTON */}
          <div className="flex justify-center py-6">
            <button
              type="button"
              onClick={() => router.push("/roadmap")}
              className="flex min-w-[390px] items-center justify-center gap-4 rounded-[18px] bg-[var(--accent-2)] px-10 py-4 text-xl font-black text-[var(--on-accent)] shadow-[0_5px_12px_rgba(0,0,0,0.2)] transition hover:scale-[1.01] active:scale-[0.99]"
            >
              <Icon
                icon="mdi:auto-fix"
                className="h-6 w-6"
              />

              Generate Personalized Roadmap

              <Icon
                icon="mdi:arrow-right"
                className="h-7 w-7"
              />
            </button>
          </div>
        </div>
      </main>
    </AppShell>
  );
}