"use client";

import { useRef, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import AppShell from "@/components/AppShell";
import StepIndicator from "@/components/StepIndicator";
import { API_URL, errorMessage } from "@/lib/api";
import { session } from "@/lib/session";
import type { NormalizedSkill } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

export default function UploadCvPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = getTranslations(language);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(f: File | null) {
    if (!f) return;

    // Validate DOCX format using MIME type and file extension fallback
    const isValidDocx =
      f.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      f.name.toLowerCase().endsWith(".docx");

    // Validate PDF format using MIME type and file extension fallback
    const isValidPdf =
      f.type === "application/pdf" ||
      f.name.toLowerCase().endsWith(".pdf");

    if (!isValidDocx && !isValidPdf) {
      setError("Please upload a valid PDF or DOCX file.");
      return;
    }

    setError(null);
    setFile(f);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0] ?? null);
    // Reset input value to allow selecting the same file consecutively
    e.target.value = "";
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
        throw new Error(await errorMessage(res, t.uploadCv.uploadFailed));
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const skills: NormalizedSkill[] = data.skills ?? [];
      if (skills.length === 0) {
        throw new Error(t.uploadCv.noSkillsFound);
      }

      session.setCvSkills(skills);
      router.push("/select_role");
    }
    catch (e) {
      setError(e instanceof Error ? e.message : t.uploadCv.genericError);
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
          {t.uploadCv.title}
        </h1>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-(--pink) rounded-[20px] py-16 flex flex-col items-center gap-4 cursor-pointer bg-(--card-bg)">
          <Icon icon="mdi:file-pdf-box" className="w-20 h-20 text-(--accent-bg)" />
          <p className="font-black text-xl text-(--accent-bg)">
            {t.uploadCv.dragDrop}
          </p>
          <p className="font-semibold text-(--accent-bg)">
            {t.uploadCv.pdfUpTo}
          </p>
          {/* File input supporting both PDF and DOCX formats */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
            </div>

            {isUploading && (
              <>
                <p className="font-light text-(--text-primary)">
                  {t.uploadCv.reading}
                </p>
                <div className="h-2.5 rounded-full bg-(--hover-bg) overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-(--accent) animate-pulse" />
                </div>
              </>
            )}
          </div>
        )}

        {error && (
          <p className="w-full rounded-[20px] border-2 border-(--accent-2) p-4 text-left font-semibold text-(--text-primary)">
            {error}
          </p>
        )}

        <button type="button" disabled={!file || isUploading} onClick={handleContinue}
          className="bg-(--accent) text-(--on-accent) rounded-[20px] px-10 py-3.5 font-black text-xl flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed">
          {isUploading ? t.uploadCv.analysing : t.uploadCv.continue}
          <Icon icon="mdi-light:arrow-up" className="w-6 h-6 rotate-90" />
        </button>

        <div className="flex items-center gap-2 text-(--text-primary)">
          <Icon icon="gala:secure" className="w-6 h-6" />
          <span className="font-black">{t.common.secureData}</span>
        </div>
      </div>
    </AppShell>
  );
}