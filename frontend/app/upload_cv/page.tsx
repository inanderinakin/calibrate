"use client";

import { useRef, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import AppShell from "@/components/AppShell";
import StepIndicator from "@/components/StepIndicator";
import { API_URL, errorMessage } from "@/lib/api";
import { session } from "@/lib/session";
import type { NormalizedSkill } from "@/lib/types";

export default function UploadCvPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [skillCount, setSkillCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    setError(null);
    setSkillCount(null);
    setFile(f);
  }

  function handleRemove() {
    setFile(null);
    setSkillCount(null);
    setError(null);
    session.setCvSkills([]);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0] ?? null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function handleContinue() {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${API_URL}/upload_cv`, { method: "POST", body });

      if (!res.ok) {
        throw new Error(await errorMessage(res, "Upload failed"));
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const skills: NormalizedSkill[] = data.skills ?? [];
      if (skills.length === 0) {
        throw new Error("We couldn't read any skills from that CV. Try another file.");
      }

      session.setCvSkills(skills);
      setSkillCount(skills.length);
    }
    catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } 
    finally {
      setIsUploading(false);
    }
  }

  return (
    <AppShell>
      <div className="p-6 md:p-10 lg:p-14 flex flex-col items-center gap-8 max-w-4xl mx-auto text-center">
        <StepIndicator activeStep={1} />

        <h1 className="text-3xl md:text-5xl font-bold text-(--text-primary)">
          Upload Your CV
        </h1>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-(--pink) rounded-[20px] py-16 flex flex-col items-center gap-4 cursor-pointer bg-(--card-bg)">
          <Icon icon="mdi:file-pdf-box" className="w-20 h-20 text-(--accent-bg)" />
          <p className="font-black text-xl text-(--accent-bg)">
            Drag &amp; drop your CV here
          </p>
          <p className="font-semibold text-(--accent-bg)">
            PDF up to 10MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        {file && (
          <div className="w-full border-2 border-(--pink) rounded-[20px] p-4 flex flex-col gap-4 text-left bg-(--card-bg)">
            <div className="flex items-center gap-4">
              <Icon icon="mdi:file-pdf-box" className="w-12 h-12 text-(--accent-bg) shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-(--text-primary) truncate">{file.name}</p>
                <p className="text-sm text-(--text-secondary)">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                aria-label="Remove this CV"
                title="Remove this CV"
                className="shrink-0 rounded-full p-2 text-(--text-secondary) hover:bg-(--hover-bg) hover:text-(--text-primary) disabled:opacity-40 disabled:cursor-not-allowed">
                <Icon icon="mdi:trash-can-outline" className="w-6 h-6" />
              </button>
            </div>

            {isUploading && (
              <>
                <p className="font-light text-(--text-primary)">
                  Reading and analyzing your CV. This takes a few seconds…
                </p>
                <div className="h-2.5 rounded-full bg-(--hover-bg) overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-(--accent) animate-indeterminate" />
                </div>
              </>
            )}

            {skillCount !== null && (
              <div className="flex items-center gap-2 text-(--text-primary)">
                <Icon icon="mdi:check-circle-outline" className="w-6 h-6 shrink-0" />
                <p className="font-semibold">
                  CV read — we found {skillCount} skills.
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="w-full rounded-[20px] border-2 border-(--accent-2) p-4 text-left font-semibold text-(--text-primary)">
            {error}
          </p>
        )}

        <button type="button" disabled={!file || isUploading}
          onClick={skillCount !== null ? () => router.push("/select_role") : handleContinue}
          className="bg-(--accent) text-(--on-accent) rounded-[20px] px-10 py-3.5 font-black text-xl flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed">
          {isUploading ? "Analysing …" : skillCount !== null ? "Select a Role" : "Continue"}
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
