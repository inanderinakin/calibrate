"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import "@/lib/iconBundleSkills";
import { AnimatePresence, motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import TrendingSkillsChart from "@/components/TrendingSkillsChart";
import { ChartSkeleton, DashboardSkeleton } from "@/components/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { getTrends } from "@/lib/api";
import { session } from "@/lib/session";
import { expectsAnalysis, useRestoreAnalysis } from "@/lib/useRestoreAnalysis";
import { useDelayedLoading } from "@/lib/useDelayedLoading";
import type { Gap, GapResult, Trend, TrendsPayload } from "@/lib/types";
import { getDisplaySkillName } from "@/lib/escoMapper";
import { topByDemand } from "@/lib/rankSkills";
import { useMeasuredHeight } from "@/lib/useMeasuredHeight";
import { getCategoryLabel } from "@/lib/skillCategories";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";
import { duration, ease } from "@/lib/motion";

type Skill = {
  name: string;
  demand: number;
  category: string;
  trend: Trend;
  closestCvSkill: string | null;
  icon: string;
  postingsCount: number;
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

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = getTranslations(language);

  const [gaps, setGaps] = useState<GapResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [trends, setTrends] = useState<TrendsPayload | null>(null);
  const [trendsFailed, setTrendsFailed] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [focusSkills, setFocusSkills] = useState<string[]>([]);
  const restored = useRestoreAnalysis();
  const [awaitingData] = useState(expectsAnalysis);
  const showLoading = useDelayedLoading(!loaded);
  const [hasRoadmap, setHasRoadmap] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [skillView, setSkillView] = useState<"missing" | "have">("missing");
  const [skillListRef, skillListHeight] = useMeasuredHeight();

  useEffect(() => {
    if (!restored) return;

    setGaps(session.getGaps());
    setHasRoadmap(session.getReport() !== null);
    setLoaded(true);
  }, [restored]);

  useEffect(() => {
    getTrends()
      .then((data) => setTrends(data))
      .catch(() => setTrendsFailed(true));
  }, []);

  const nothingToShow = (
    <div className="mx-auto flex max-w-3xl flex-col items-start gap-5 rounded-[30px] bg-(--card-bg) p-8 shadow-lg">
      <Icon
        icon="mdi:file-search-outline"
        className="h-14 w-14 text-(--accent-2)"
      />

      <h1 className="text-3xl font-black text-(--text-primary) md:text-5xl">
        {t.common.nothingToShowYet}
      </h1>

      <p className="text-lg text-[var(--text-secondary)]">
        {t.common.uploadCvPrompt}
      </p>

      <Link
        href="/upload_cv"
        className="btn-hover rounded-[20px] bg-[var(--accent)] px-8 py-3.5 text-lg font-bold text-[var(--on-accent)]"
      >
        {t.common.uploadYourCv}
      </Link>
    </div>
  );

  // Skeleton a dashboard only when one is actually coming. Signed out there is
  // nothing to restore, and the full-page skeleton collapsing into this one small
  // card was a worse jump than never showing it.
  if (!loaded) {
    return (
      <AppShell backHref="/analyse_cv">
        {awaitingData ? showLoading && <DashboardSkeleton /> : nothingToShow}
      </AppShell>
    );
  }

  if (!gaps) {
    return <AppShell backHref="/analyse_cv">{nothingToShow}</AppShell>;
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

  const gapBySkill = new Map<string, { gap: Gap; role: string }>();

  for (const role of roles) {
    for (const gap of gaps.gaps[role] ?? []) {
      const seen = gapBySkill.get(gap.skill);

      if (!seen || gap.demand_percentage > seen.gap.demand_percentage) {
        gapBySkill.set(gap.skill, { gap, role });
      }
    }
  }

  /* ---------------- SKILLS YOU HAVE ---------------- */

  // matched_skills is optional: the backend only started keeping the demanded skills a
  // CV already covers recently, and analyses saved before that have no such field.
  const matchedByRole = gaps.matched_skills;

  const matchedSkills: Skill[] = matchedByRole
    ? topByDemand(
        roles.flatMap((role) =>
          (matchedByRole[role] ?? []).map((entry) => ({ ...entry, role }))
        ),
        5
      ).map((entry) => {
        const name = getDisplaySkillName(entry.skill);
        return {
          name,
          demand: Math.round(entry.demand_percentage * 100),
          category: entry.esco_category,
          trend: entry.trend,
          closestCvSkill: null,
          icon: getSkillIcon(name),
          postingsCount: gaps.matched_data[entry.role]?.postings_count ?? 0,
        };
      })
    : [];

  const missingSkills: Skill[] = [...gapBySkill.values()]
    .sort((a, b) => b.gap.demand_percentage - a.gap.demand_percentage)
    .slice(0, 5)
    .map(({ gap, role }) => {
      const name = getDisplaySkillName(gap.skill);
      return {
        name,
        demand: Math.round(gap.demand_percentage * 100),
        category: gap.esco_category,
        trend: gap.trend,
        closestCvSkill: gap.closest_cv_skill,
        icon: getSkillIcon(name),
        postingsCount: gaps.matched_data[role]?.postings_count ?? 0,
      };
    });

  const canToggleSkills = matchedByRole != null;
  const showingHave = canToggleSkills && skillView === "have";
  const shownSkills = showingHave ? matchedSkills : missingSkills;

  const missingSkillNames = [...gapBySkill.keys()].map(getDisplaySkillName);

  const selected =
    missingSkills.find((skill) => skill.name === selectedSkill) ??
    missingSkills[0] ??
    null;

  function toggleFocusSkill(name: string) {
    setFocusSkills((current) =>
      current.includes(name)
        ? current.filter((skill) => skill !== name)
        : [...current, name]
    );
    setSelectedSkill(name);
  }

  /* ---------------- UI ---------------- */

  return (
    <AppShell backHref="/analyse_cv">
      <div className="mx-auto max-w-[1500px]">

          {/* HEADER */}
          <motion.header
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5"
          >
            <h1 className="text-4xl font-black tracking-[-0.04em] text-(--text-primary) md:text-5xl lg:text-6xl">
              {t.dashboard.welcomeBack}
              {user?.firstName ? `, ${user.firstName}` : ""}!
            </h1>

            <p className="mt-1 text-lg text-(--text-muted) md:text-xl">
              {t.dashboard.matchSubtitle(roles.length > 0 ? roles.join(", ") : t.dashboard.yourTargetRole)}
            </p>
          </motion.header>

          {/* TOP SECTION */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.3fr]"
          >

            {/* MATCH CARD */}
            <div className="glass-card rounded-[20px] p-7">
              <div className="flex h-full flex-col justify-center gap-5 md:flex-row md:items-center md:gap-8">

                {/* MATCH CIRCLE */}
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="relative mx-auto flex h-[220px] w-[220px] shrink-0 items-center justify-center rounded-full bg-[#dedede]"
                >
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
                      {t.dashboard.match}
                    </span>
                  </div>
                </motion.div>

                {/* MATCH INFO */}
                <div className="flex flex-col justify-center">
                  <h2 className="text-2xl font-black text-[var(--text-primary)]">
                    {matchPercent >= 60
                      ? t.dashboard.strongMatch
                      : t.dashboard.roomToGrow}
                  </h2>

                  <p className="mt-2 max-w-[250px] text-lg leading-snug text-[var(--text-secondary)]">
                    {t.dashboard.matchesRole(matchPercent)}
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
                      ? t.dashboard.onTrack
                      : t.dashboard.roomToGrowShort}
                  </div>

                  <p className="mt-3 text-xs text-[var(--text-muted)]">
                    {t.dashboard.demandedSkillsCount(matched, total)}
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
            <div className="glass-card rounded-[20px] p-6">

              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon
                    icon={showingHave ? "mdi:check-decagram-outline" : "mdi:target"}
                    className="h-9 w-9 text-[var(--accent-2)]"
                  />

                  <h2 className="text-2xl font-black text-[var(--text-primary)]">
                    {showingHave ? t.dashboard.skillsYouHave : t.dashboard.missingSkills}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMethodology((open) => !open)}
                  aria-expanded={showMethodology}
                  className="flex items-center gap-2 rounded-lg border border-black/15 px-4 py-2 text-sm font-medium text-[var(--accent-2)]"
                >
                  {t.dashboard.whyTheseSkills}
                  <Icon
                    icon="mdi:information-outline"
                    className="h-5 w-5"
                  />
                </button>
              </div>

              {canToggleSkills && (
                <div className="mb-5 flex w-fit gap-1 rounded-xl border border-black/10 p-1">
                  {(["missing", "have"] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setSkillView(view)}
                      aria-pressed={skillView === view}
                      className={`relative rounded-lg px-4 py-1.5 text-sm font-bold transition-colors ${
                        skillView === view
                          ? "text-[var(--on-accent)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {skillView === view && (
                        <motion.span
                          layoutId="skillViewPill"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                          className="absolute inset-0 rounded-lg bg-[var(--accent-2)]"
                        />
                      )}

                      <span className="relative">
                        {view === "missing"
                          ? `${t.dashboard.viewMissing} (${missingSkills.length})`
                          : `${t.dashboard.viewHave} (${matchedSkills.length})`}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {showMethodology && (
                <div className="mb-5 rounded-[16px] border border-[var(--accent-2)] p-4">
                  <p className="font-black text-[var(--text-primary)]">
                    {t.dashboard.methodologyTitle}
                  </p>

                  <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
                    {roles.map((role) => (
                      <li key={role}>
                        {t.dashboard.methodologyPostings(
                          role,
                          gaps.matched_data[role]?.postings_count ?? 0
                        )}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {t.dashboard.methodologyRule}
                  </p>

                  {trends?.recent_window && (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {t.dashboard.methodologyWindow(
                        trends.recent_window.start,
                        trends.recent_window.end
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* The outer box animates to whatever the inner one measures, so swapping to
                  a shorter list shrinks the card instead of snapping it. popLayout takes
                  the outgoing list out of flow, so the incoming one lands immediately and
                  the height only has to travel the real difference. */}
              <motion.div
                initial={false}
                animate={{ height: skillListHeight }}
                transition={{ duration: duration.fast, ease: ease.smoothOut }}
                className="overflow-hidden"
              >
                <div ref={skillListRef} className="relative">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={skillView}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: duration.fast, ease: ease.smoothOut }}
                    >
                      {shownSkills.length === 0 ? (
                        <p className="text-[var(--text-muted)]">
                          {showingHave ? t.dashboard.noMatchedSkills : t.dashboard.noGapsFound}
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {shownSkills.map((skill) => (
                            <button
                              key={skill.name}
                              type="button"
                              onClick={() => setSelectedSkill(skill.name)}
                              className={`grid w-full grid-cols-[58px_1fr_65px] items-center gap-3 rounded-xl text-left transition hover:text-[var(--win)] dark:hover:text-[var(--light-blue)] hover:bg-(--hover-bg) ${
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
                                      width: `${skill.demand}%`,
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-xl font-black text-[var(--text-primary)]">
                                  {skill.demand}%
                                </span>

                                <p className="text-xs text-[var(--text-muted)]">
                                  {t.dashboard.basedOnPostings(skill.postingsCount)}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>

              <p className="mt-5 text-xs text-[var(--text-muted)]">
                {t.dashboard.percentagesNote}
              </p>
            </div>
          </motion.section>

          {/* LEARNING FOCUS */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5 }}
            className="mt-5 glass-card rounded-[20px] p-6">

            <div className="mb-5 flex items-start gap-3">
              <Icon
                icon="mdi:target"
                className="mt-0.5 h-9 w-9 shrink-0 text-[var(--accent-2)]"
              />

              <div>
                <h2 className="text-2xl font-black text-[var(--text-primary)]">
                  {t.dashboard.chooseLearningFocus}
                </h2>

                <p className="mt-1 text-base text-[var(--text-secondary)]">
                  {t.dashboard.selectSkillPrompt}
                </p>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {t.dashboard.focusNote}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

              {/* SKILLS */}
              {missingSkills.map((skill) => {
                const isSelected = focusSkills.includes(skill.name);

                return (
                  <button
                    key={skill.name}
                    type="button"
                    onClick={() => toggleFocusSkill(skill.name)}
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

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words pr-8 text-base font-bold leading-tight text-[var(--text-primary)]">
                          {skill.name}
                        </h3>

                        <p className="text-sm text-[var(--text-muted)]">
                          {t.dashboard.demandInYourRoles}
                        </p>

                        <p className="text-base font-black text-[var(--accent-2)]">
                          {skill.demand}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-1.5 rounded-full bg-[#e4e4e4]">
                      <div
                        className="h-full rounded-full bg-[var(--accent-2)]"
                        style={{
                          width: `${skill.demand}%`,
                        }}
                      />
                    </div>
                  </button>
                );
              })}

              {/* COMPLETE ROADMAP */}
              <button
                type="button"
                onClick={() => {
                  setFocusSkills([]);
                  setSelectedSkill(null);
                }}
                className={`relative rounded-[16px] border-2 border-dashed p-4 text-left transition ${
                  focusSkills.length === 0
                    ? "border-[var(--accent-2)]"
                    : "border-black/15 hover:border-[var(--accent-2)]/50"
                }`}
              >
                <div
                  className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    focusSkills.length === 0
                      ? "border-[var(--accent-2)]"
                      : "border-black/30"
                  }`}
                >
                  {focusSkills.length === 0 && (
                    <div className="h-3 w-3 rounded-full bg-[var(--accent-2)]" />
                  )}
                </div>

                <Icon
                  icon="mdi:map-outline"
                  className="h-10 w-10 text-[var(--accent-2)]"
                />

                <h3 className="mt-2 text-lg font-black leading-tight text-[var(--text-primary)]">
                  {t.dashboard.completeCareerRoadmap.split("\n").map((line, i) => (
                    <span key={i}>{i > 0 && <br />}{line}</span>
                  ))}
                </h3>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {t.dashboard.allMissingSkillsPlan.split("\n").map((line, i) => (
                    <span key={i}>{i > 0 && <br />}{line}</span>
                  ))}
                </p>
              </button>
            </div>
          </motion.section>

          {/* MARKET TRENDS */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5 }}
            className="mt-5 glass-card rounded-[20px] p-6">

            <div className="mb-5 flex items-center gap-2">
              <h2 className="text-2xl font-black text-[var(--text-primary)]">
                {t.dashboard.demandInYourRoles}
              </h2>
              <span title={t.dashboard.demandInYourRolesInfo}>
                <Icon
                  icon="mdi:information-outline"
                  className="h-5 w-5 text-[var(--text-muted)]"
                />
              </span>
            </div>

            {trendsFailed ? (
              <p className="text-[var(--text-secondary)]">
                {t.dashboard.marketTrendsUnavailable}
              </p>
            ) : !trends ? (
              <ChartSkeleton />
            ) : (
              <TrendingSkillsChart
                data={trends}
                missing={missingSkillNames}
                focus={selectedSkill}
                roles={roles}
              />
            )}
          </motion.section>

          {/* ROADMAP PREVIEW */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5 }}
            className="mt-5 glass-card rounded-[20px] p-6">

            <div className="mb-5 flex items-center gap-3">
              <Icon
                icon="mdi:chart-box-outline"
                className="h-9 w-9 text-[var(--accent-2)]"
              />

              <h2 className="text-xl font-black text-[var(--text-primary)]">
                {t.dashboard.roadmapPreviewFor}{" "}
                {selected?.name ?? t.dashboard.completeCareer}
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
                    {t.dashboard.marketDemand}
                  </p>

                  <p className="text-base font-black text-[var(--text-primary)]">
                    {selected ? t.dashboard.demandInYourRolesValue(selected.demand) : "-"}
                  </p>
                </div>
              </div>

              {/* MODULES */}
              <div className="flex items-center gap-4 px-4 py-2 md:px-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0]">
                  <Icon
                    icon="mdi:trending-up"
                    className="h-7 w-7 text-[var(--accent-2)]"
                  />
                </div>

                <div>
                  <p className="text-sm text-[var(--text-muted)]">
                    {t.dashboard.trendLabel}
                  </p>

                  <p className="text-base font-black text-[var(--text-primary)]">
                    {selected ? t.common.trend[selected.trend] : "-"}
                  </p>
                </div>
              </div>

              {/* PROJECTS */}
              <div className="flex items-center gap-4 px-4 py-2 md:px-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0]">
                  <Icon
                    icon="mdi:tag-outline"
                    className="h-7 w-7 text-[var(--accent-2)]"
                  />
                </div>

                <div>
                  <p className="text-sm text-[var(--text-muted)]">
                    {t.dashboard.category}
                  </p>

                  <p className="text-base font-black text-[var(--text-primary)]">
                    {selected ? getCategoryLabel(selected.category, language) : "-"}
                  </p>
                </div>
              </div>

              {/* DURATION */}
              <div className="flex items-center gap-4 px-4 py-2 md:px-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0]">
                  <Icon
                    icon="mdi:file-account-outline"
                    className="h-7 w-7 text-[var(--accent-2)]"
                  />
                </div>

                <div>
                  <p className="text-sm text-[var(--text-muted)]">
                    {t.dashboard.closestSkillOnCv}
                  </p>

                  <p className="text-base font-black text-[var(--text-primary)]">
                    {selected?.closestCvSkill ?? t.dashboard.noneFound}
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* PROFILE SUMMARY */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5 }}
            className="mt-5"
          >
            <div className="glass-card rounded-[20px] p-5 w-full">

              <div className="mb-4 flex items-center gap-3">
                <Icon
                  icon="mdi:account-circle-outline"
                  className="h-8 w-8 text-[var(--accent-2)]"
                />

                <h2 className="text-xl font-black text-[var(--text-primary)]">
                  {t.dashboard.profileSummary}
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
                    {t.dashboard.currentRole}
                  </span>

                  <span className="text-xs font-light text-[var(--on-accent)]">
                    {user?.studyField ?? t.dashboard.notSet}
                  </span>
                </div>

                {/* EMAIL */}
                <div className="flex flex-col gap-1 rounded-[18px] bg-[var(--accent)] p-4">
                  <Icon
                    icon="clarity:email-line"
                    className="h-8 w-8 text-[var(--on-accent)]"
                  />

                  <span className="text-sm font-black text-[var(--on-accent)]">
                    {t.dashboard.email}
                  </span>

                  <a
                    href={`mailto:${user?.email ?? ""}`}
                    className="truncate text-xs font-light text-[var(--on-accent)] underline"
                  >
                    {user?.email ?? "-"}
                  </a>
                </div>
              </div>
            </div>
          </motion.section>

          {/* GENERATE BUTTON */}
          <div className="flex justify-center py-6">
            <motion.button
              type="button"
              onClick={() => {
                session.setFocusSkills(focusSkills);
                router.push("/roadmap");
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex min-w-[390px] items-center justify-center gap-4 rounded-[18px] bg-[var(--accent-2)] px-10 py-4 text-xl font-black text-[var(--on-accent)] shadow-[0_5px_12px_rgba(0,0,0,0.2)] transition hover:scale-[1.01] active:scale-[0.99]"
            >
              <Icon
                icon={hasRoadmap ? "mdi:map-outline" : "mdi:auto-fix"}
                className="h-6 w-6"
              />

              {hasRoadmap ? t.dashboard.viewRoadmap : t.dashboard.generateRoadmap}

              <Icon
                icon="mdi:arrow-right"
                className="h-7 w-7"
              />
            </motion.button>
          </div>
        </div>
    </AppShell>
  );
}
