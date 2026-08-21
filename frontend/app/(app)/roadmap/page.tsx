"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { AnimatePresence, motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import { session } from "@/lib/session";
import type { ProjectStep, Recommendation, Report } from "@/lib/types";
import { getDisplaySkillName } from "@/lib/escoMapper";
import { getCategoryLabel } from "@/lib/skillCategories";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";
import { getCompletedProjects, getCompletedSkills, getCvBullet, setCompletedProjects, setCompletedSkills } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useRestoreAnalysis } from "@/lib/useRestoreAnalysis";
import { downloadRoadmapPdf } from "@/lib/roadmapPdf";

export default function RoadmapPage() {
  const allowed = useRequireAuth();
  const restored = useRestoreAnalysis();
  const { language } = useLanguage();
  const t = getTranslations(language);
  const [report, setReport] = useState<Report | null>(null);
  const [cvUploaded, setCvUploaded] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [doneProjects, setDoneProjects] = useState<Set<string>>(new Set());

  function toggleProject(title: string) {
    const previous = doneProjects;
    const next = new Set(previous);

    if (next.has(title)) {
      next.delete(title);
    } else {
      next.add(title);
    }

    setDoneProjects(next);
    setCompletedProjects([...next]).catch(() => setDoneProjects(previous));
  }

  function toggleCompleted(skill: string) {
    const previous = completed;
    const next = new Set(previous);

    if (next.has(skill)) {
      next.delete(skill);
    } else {
      next.add(skill);
    }

    setCompleted(next);
    setCompletedSkills([...next]).catch(() => setCompleted(previous));
  }

  useEffect(() => {
    if (!restored) return;

    const skills = session.getCvSkills();
    const savedReport = session.getReport();

    setCvUploaded(Array.isArray(skills) && skills.length > 0);
    setReport(savedReport);
    setFocus(session.getFocusSkills() ?? []);
    setLoaded(true);
  }, [restored]);

  const [exporting, setExporting] = useState(false);

  async function exportPdf() {
    if (!report) return;

    setExporting(true);

    try {
      await downloadRoadmapPdf(report, completed, t.common.trend, {
        title: t.roadmap.title,
        roles: t.roadmap.pdfRoles,
        generatedOn: t.roadmap.pdfGeneratedOn,
        completed: t.roadmap.completed,
        trend: t.roadmap.pdfTrend,
        resources: t.roadmap.pdfResources,
        noResources: t.roadmap.noResources,
        resourceTitle: t.roadmap.pdfResourceTitle,
        resourceType: t.roadmap.pdfResourceType,
        resourceLanguage: t.roadmap.pdfResourceLanguage,
      });
    }
    finally {
      setExporting(false);
    }
  }

  function toggleExpanded(skill: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  }

  useEffect(() => {
    async function loadCompleted() {
      // Both, in parallel. Project ticks were being written to the account by
      // toggleProject and never read back, so they vanished on every reload.
      const [skills, projects] = await Promise.allSettled([
        getCompletedSkills(),
        getCompletedProjects(),
      ]);

      setCompleted(new Set(skills.status === "fulfilled" ? skills.value : []));
      setDoneProjects(new Set(projects.status === "fulfilled" ? projects.value : []));
    }

    loadCompleted();
  }, []);

  if (!allowed) return <AppShell backHref="/dashboard" />;

  // Avoid rendering the wrong state before checking the session.
  if (!loaded || cvUploaded === null) {
    return <AppShell backHref="/dashboard" />;
  }

  // No CV uploaded
  if (!cvUploaded) {
    return (
      <AppShell backHref="/dashboard">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-5 rounded-[30px] glass-card p-8 shadow-lg">
          <Icon
            icon="mdi:file-search-outline"
            className="h-14 w-14 text-[var(--accent-2)]"
          />

          <h1 className="text-3xl font-black text-[var(--text-primary)] md:text-5xl">
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
      </AppShell>
    );
  }

  // CV exists, but no roadmap has been generated yet.
  if (!report) {
    return (
      <AppShell backHref="/dashboard">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-5 rounded-[30px] glass-card p-8 shadow-lg">
          <Icon
            icon="mdi:map-outline"
            className="h-14 w-14 text-(--accent-2)"
          />

            <h1 className="text-3xl font-black text-(--text-primary) md:text-5xl">
              {t.roadmap.noRoadmapYet}
            </h1>

            <p className="text-lg text-[var(--text-secondary)]">
              {t.roadmap.noRoadmapBody}
            </p>

            <Link
              href="/select_role"
              className="btn-hover rounded-[20px] bg-[var(--accent)] px-8 py-3.5 text-lg font-bold text-[var(--on-accent)]"
            >
              {t.roadmap.selectTargetRoles}
            </Link>
        </div>
      </AppShell>
    );
  }

  // An empty focus selection means the user asked for the whole roadmap. A
  // selection that matches nothing falls back to it too, rather than rendering
  // an empty page.
  const picked = report.recommendations.filter((skill) => focus.includes(skill.skill));
  const filtering = focus.length > 0 && picked.length > 0;
  const shown = filtering ? picked : report.recommendations;

  // A project step belongs after the skills it makes you combine, so the roadmap
  // reads learn, learn, build. Filtering down to a few skills breaks that pairing,
  // so the projects sit out until the full roadmap is back.
  const steps: ({ kind: "skill"; skill: Recommendation } | { kind: "project"; project: ProjectStep })[] = [];

  for (const skill of shown) {
    steps.push({ kind: "skill", skill });

    if (filtering) continue;

    for (const project of report.projects ?? []) {
      if (project.after_rank === skill.rank) steps.push({ kind: "project", project });
    }
  }

  // CV + roadmap exist → show roadmap.
  return (
    <AppShell backHref="/dashboard">
      <div className="flex flex-col gap-6">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-5xl font-bold text-(--text-primary)">
            {t.roadmap.title}
          </h1>

          <h2 className="mt-2 text-lg font-medium text-(--text-primary)">
            {report.target_roles.join(", ")} {t.roadmap.careerPath}
          </h2>

          <p className="text-(--text-secondary) text-lg font-semibold">
            {t.roadmap.subtitle}
          </p>

          {report.summary && (
            <p className="mt-3 text-(--text-muted)">
              {report.summary}
            </p>
          )}

          <button
            type="button"
            onClick={exportPdf}
            disabled={exporting}
            className="btn-hover mt-4 flex items-center gap-2 rounded-lg border-2 border-(--accent-bg) px-4 py-2 text-sm font-semibold text-(--accent-bg) disabled:opacity-60"
          >
            <Icon icon="mdi:file-pdf-box" className="h-5 w-5" />
            {t.roadmap.exportPdf}
          </button>

          {filtering && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-(--text-secondary)">
              {t.roadmap.focusedOn(shown.length)}

              <button
                type="button"
                onClick={() => {
                  session.setFocusSkills([]);
                  setFocus([]);
                }}
                className="underline underline-offset-2 text-(--accent-2)"
              >
                {t.roadmap.showAll}
              </button>
            </p>
          )}
        </motion.header>

        <div className="relative flex flex-col gap-10">
          <div
            aria-hidden
            className="absolute top-0 bottom-0 left-5 w-0.5 -translate-x-1/2 bg-(--accent-2) md:left-1/2"
          />

          {steps.map((step, index) => {
            if (step.kind === "project") {
              return (
                <ProjectCard
                  key={step.project.title}
                  project={step.project}
                  index={index}
                  done={doneProjects.has(step.project.title)}
                  onToggle={() => toggleProject(step.project.title)}
                  t={t.roadmap}
                  language={language}
                />
              );
            }

            const skill = step.skill;
            const collapsed =
              completed.has(skill.skill) && !expanded.has(skill.skill);

            return (
            <motion.div
              key={skill.skill}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="absolute left-5 top-8 z-10 flex size-11 -translate-x-1/2 items-center justify-center rounded-full bg-(--accent-bg) text-lg font-semibold text-(--accent-text) md:top-1/2 md:left-1/2 md:-translate-y-1/2">
                {skill.rank}
              </div>

              <div
                className={
                  index % 2 === 0
                    ? "ml-16 md:ml-0 md:w-1/2 md:pr-10"
                    : "ml-16 md:ml-auto md:w-1/2 md:pl-10"
                }
              >
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  className={`glass-card rounded-[20px] shadow-[4px_4px_4px_rgba(0,0,0,0.2)] flex flex-col ${
                    collapsed ? "gap-0 p-5" : "gap-5 p-6"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-light text-(--text-muted)">
                        {getCategoryLabel(skill.esco_category, language)}
                      </div>

                      <p className="mt-1 flex items-center gap-2 text-2xl font-black text-(--text-primary)">
                        {completed.has(skill.skill) && (
                          <Icon
                            icon="lets-icons:check-fill"
                            className="h-6 w-6 shrink-0 text-(--text-primary)"
                          />
                        )}
                        {getDisplaySkillName(skill.skill)}
                      </p>
                    </div>

                    {completed.has(skill.skill) && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(skill.skill)}
                        aria-expanded={!collapsed}
                        aria-label={collapsed ? t.roadmap.showDetails : t.roadmap.hideDetails}
                        className="btn-hover shrink-0 rounded-full border-2 border-(--accent-bg) p-2 text-(--accent-bg)"
                      >
                        <Icon
                          icon="weui:arrow-outlined"
                          className={`h-4 w-4 transition-transform ${
                            collapsed ? "rotate-90" : "-rotate-90"
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.div
                        key="details"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-5">
                          <p className="max-w-prose text-(--text-primary)">
                            {skill.reason}
                          </p>

                          <span className="self-start rounded-[5px] bg-(--accent) px-3 py-1 text-xs font-bold text-(--on-accent)">
                            {t.common.trend[skill.trend]}
                          </span>

                          <div className="flex flex-col gap-2">
                    {skill.resources.length > 0 ? (
                      skill.resources.map((resource) => (
                        <div
                          key={resource.url}
                          className="flex items-baseline gap-2"
                        >
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 text-(--text-primary)"
                          >
                            {resource.title}
                          </a>

                          <span className="text-xs uppercase text-(--text-muted)">
                            {resource.language}
                          </span>

                          <span className="text-xs capitalize text-(--text-muted)">
                            {t.roadmap.resourceType[resource.type]}
                          </span>
                        </div>
                      ))
                            ) : (
                              <p className="text-sm text-(--text-muted)">
                                {t.roadmap.noResources}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!collapsed && (
                    <motion.button
                      type="button"
                      onClick={() => toggleCompleted(skill.skill)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className={`rounded-lg py-2 font-semibold transition-colors flex items-center justify-center gap-2 ${
                        completed.has(skill.skill)
                          ? "bg-[var(--accent)] text-[var(--on-accent)]"
                          : "border-2 border-(--accent-bg) text-(--accent-bg)"
                      }`}
                    >
                      {completed.has(skill.skill) && (
                        <Icon icon="lets-icons:check-fill" className="w-5 h-5" />
                      )}
                      {completed.has(skill.skill)
                        ? t.roadmap.completed
                        : t.roadmap.markCompleted}
                    </motion.button>
                  )}
                </motion.div>
              </div>
            </motion.div>
          );
          })}
        </div>
      </div>
    </AppShell>
  );
}

type RoadmapText = ReturnType<typeof getTranslations>["roadmap"];

function ProjectCard({
  project,
  index,
  done,
  onToggle,
  t,
  language,
}: {
  project: ProjectStep;
  index: number;
  done: boolean;
  onToggle: () => void;
  t: RoadmapText;
  language: string;
}) {
  const [notes, setNotes] = useState("");
  const [bullet, setBullet] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function writeBullet() {
    setWriting(true);
    setError(null);

    try {
      setBullet(await getCvBullet(project, notes, language));
    }
    catch {
      setError(t.bulletError);
    }
    finally {
      setWriting(false);
    }
  }

  async function copyBullet() {
    if (!bullet) return;

    await navigator.clipboard.writeText(bullet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <div className="absolute left-5 top-8 z-10 flex size-11 -translate-x-1/2 items-center justify-center rounded-full bg-(--accent-2) text-(--on-accent) md:top-1/2 md:left-1/2 md:-translate-y-1/2">
        <Icon icon="mdi:hammer-wrench" className="size-6" />
      </div>

      <div className={index % 2 === 0 ? "ml-16 md:ml-0 md:w-1/2 md:pr-10" : "ml-16 md:ml-auto md:w-1/2 md:pl-10"}>
        <div className="glass-card flex flex-col gap-4 rounded-[20px] border-2 border-(--accent-2) p-6 shadow-[4px_4px_4px_rgba(0,0,0,0.2)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-(--accent-2) px-3 py-1 text-xs font-bold text-(--on-accent)">
              {t.projectStep}
            </span>
            {project.skills.map((skill) => (
              <span key={skill} className="rounded-lg bg-(--hover-bg) px-2.5 py-1 text-xs font-bold">
                {getDisplaySkillName(skill)}
              </span>
            ))}
            {done && (
              <span className="flex items-center gap-1 rounded-lg bg-(--accent) px-2.5 py-1 text-xs font-bold text-(--on-accent)">
                <Icon icon="mdi:check-circle" className="size-4" />
                {t.projectDone}
              </span>
            )}
          </div>

          <h3 className="text-xl font-black text-(--text-primary)">{project.title}</h3>
          <p className="text-(--text-secondary)">{project.brief}</p>

          <div className="flex flex-col gap-3">
            <ProjectRow icon="mdi:flag-checkered" label={t.projectGoal} value={project.completion_goal} strong />
            <ProjectRow icon="mdi:lock-open-variant-outline" label={t.projectForces} value={project.forces} />
            <ProjectRow icon="mdi:chart-bar" label={t.projectDemand} value={project.demand_note} />
          </div>

          <button
            onClick={onToggle}
            className={`flex w-fit items-center gap-2 rounded-xl px-5 py-2.5 font-bold transition ${
              done ? "border border-(--accent)/20 text-(--text-primary)" : "bg-(--accent-bg) text-(--accent-text)"
            }`}
          >
            <Icon icon={done ? "mdi:undo" : "mdi:check"} className="size-5" />
            {done ? t.projectUndo : t.projectMarkDone}
          </button>

          <AnimatePresence initial={false}>
            {done && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-(--border-color)/20 pt-4">
                  <p className="font-bold text-(--text-primary)">{t.bulletTitle}</p>
                  <p className="mt-0.5 text-sm text-(--text-muted)">{t.bulletHint}</p>

                  <label className="mt-3 block text-sm font-medium" htmlFor={`notes-${project.title}`}>
                    {t.bulletNotesLabel}
                  </label>
                  <textarea
                    id={`notes-${project.title}`}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={t.bulletNotesPlaceholder}
                    rows={2}
                    className="mt-1.5 w-full rounded-xl border border-(--border-color)/30 bg-(--input-bg) px-4 py-2.5 text-sm outline-none focus:border-(--accent-2)"
                  />

                  <button
                    onClick={writeBullet}
                    disabled={writing}
                    className="mt-3 flex items-center gap-2 rounded-xl bg-(--accent) px-5 py-2.5 font-bold text-(--on-accent) disabled:opacity-50"
                  >
                    <Icon icon={writing ? "cuida:loading-left-outline" : "mdi:format-quote-close"} className={`size-5 ${writing ? "animate-spin-ccw" : ""}`} />
                    {writing ? t.bulletWriting : bullet ? t.bulletRewrite : t.bulletWrite}
                  </button>

                  {error && <p className="mt-3 text-sm font-semibold">{error}</p>}

                  {bullet && (
                    <div className="mt-4 rounded-xl border border-(--accent-2)/40 p-4">
                      <p className="text-(--text-primary)">{bullet}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button
                          onClick={copyBullet}
                          className="flex items-center gap-1.5 rounded-lg border border-(--accent)/20 px-4 py-2 text-sm font-bold"
                        >
                          <Icon icon={copied ? "mdi:check" : "mdi:content-copy"} className="size-4" />
                          {copied ? t.bulletCopied : t.bulletCopy}
                        </button>
                        <p className="text-xs text-(--text-muted)">{t.bulletOwnIt}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function ProjectRow({ icon, label, value, strong }: { icon: string; label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex gap-3">
      <Icon icon={icon} className="mt-0.5 size-5 shrink-0 text-(--accent-2)" />
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-(--text-muted)">{label}</p>
        <p className={`mt-0.5 ${strong ? "font-semibold text-(--text-primary)" : "text-(--text-secondary)"}`}>{value}</p>
      </div>
    </div>
  );
}
