"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { session } from "@/lib/session";
import type { Report } from "@/lib/types";
import { getDisplaySkillName } from "@/lib/escoMapper";
import { session } from "@/lib/session"; // session okumak için[cite: 3]

export default function CvSkillsList() {
  const skills = session.getCvSkills(); // NormalizedSkill[] verisini çeker[cite: 3, 4]

  return (
    <div className="flex flex-wrap gap-2">
      {skills?.map((item, index) => (
        <span key={index} className="px-3 py-1 bg-gray-200 rounded-lg text-sm">
          {/* Doğrudan item.skill demek yerine mapper fonksiyonundan geçiriyoruz */}
          {getDisplaySkillName(item.skill)}
        </span>
      ))}
    </div>
  );
}

export default function RoadmapPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setReport(session.getReport());
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <AppShell>
        <div className="p-6 md:p-10 lg:p-14" />
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <div className="p-6 md:p-10 lg:p-14 flex flex-col items-start gap-4">
          <h1 className="text-3xl md:text-5xl font-bold text-(--text-primary)">
            No roadmap yet
          </h1>
          <p className="text-(--text-secondary) text-lg">
            Upload your CV and pick your target roles, and we&apos;ll build one for you.
          </p>
          <Link
            href="/upload_cv"
            className="bg-(--accent) text-(--on-accent) rounded-[20px] px-8 py-3.5 font-bold text-lg"
          >
            Upload your CV
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 md:p-10 lg:p-14 flex flex-col gap-6">
        <header>
          <h1 className="text-3xl md:text-5xl font-bold text-(--text-primary)">
            Your Personalized Roadmap!
          </h1>
          <h2 className="mt-2 text-lg font-medium text-(--text-primary)">
            {report.target_roles.join(", ")} Career Path
          </h2>
          <p className="text-(--text-secondary) text-lg font-semibold">
            Follow this roadmap to build the skills you need and achieve your career goals.
          </p>
          {report.summary && (
            <p className="mt-3 max-w-prose text-(--text-muted)">{report.summary}</p>
          )}
        </header>

        <div className="relative flex flex-col gap-10">
          <div
            aria-hidden
            className="absolute top-0 bottom-0 left-5 w-0.5 -translate-x-1/2 bg-(--accent-2) md:left-1/2"
          />

          {report.recommendations.map((skill, index) => (
            <div key={skill.skill} className="relative">
              <div className="absolute left-5 top-8 z-10 flex size-11 -translate-x-1/2 items-center justify-center rounded-full bg-(--accent-bg) text-lg font-semibold text-(--accent-text) md:top-1/2 md:left-1/2 md:-translate-y-1/2">
                {skill.rank}
              </div>

              <div className={index % 2 === 0 ? "ml-16 md:ml-0 md:w-1/2 md:pr-10" : "ml-16 md:ml-auto md:w-1/2 md:pl-10"}>
                <div className="bg-(--card-bg) rounded-[20px] shadow-[4px_4px_4px_rgba(0,0,0,0.2)] p-6 flex flex-col gap-5">
                  <div className="text-xs font-light text-(--text-muted)">{skill.esco_category}</div>
                  <p className="text-2xl font-black">{skill.skill}</p>
                  <p className="max-w-prose">{skill.reason}</p>
                  <span className="self-start rounded-[5px] bg-(--accent) px-3 py-1 text-xs font-bold text-(--on-accent)">
                    {skill.trend}
                  </span>
                  <div className="flex flex-col gap-2">
                    {skill.resources.length > 0 ? skill.resources.map((resource) => (
                      <div key={resource.url} className="flex items-baseline gap-2">
                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                          {resource.title}
                        </a>
                        <span className="text-xs uppercase text-(--text-muted)">{resource.language}</span>
                        <span className="text-xs capitalize text-(--text-muted)">{resource.type}</span>
                      </div>
                    )) : (
                      <p className="text-sm text-(--text-muted)">
                        No learning resources are available for this skill at the moment. Please check back later.
                      </p>
                    )}
                    <button className="border-2 rounded-lg">Mark as Completed!</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
