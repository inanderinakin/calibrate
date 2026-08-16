"use client";

import { useRef, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import StepIndicator from "@/components/StepIndicator";
import { isTimeout, persistSession, uploadCv } from "@/lib/api";
import { session } from "@/lib/session";
import type { NormalizedSkill } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

const MAX_FILE_SIZE_MB = 25; // Backend limits to 25MB at main.py:69
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function UploadCvPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = getTranslations(language);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [skillCount, setSkillCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(f: File | null) {
    if (!f) return;

    // Validate file size before proceeding (Fixes #65)
    if (f.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
      return;
    }

    // Validate DOCX format using MIME type and file extension fallback (Fixes #59)
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
      const data = await uploadCv(file);

      const skills: NormalizedSkill[] = data.skills ?? [];

      if (skills.length === 0) {
        throw new Error(t.uploadCv.noSkillsFound);
      }

      session.setCvSkills(skills);
      session.clearDerived();
      persistSession().catch(() => {});
      setSkillCount(skills.length);
    }
    catch (e) {
      setError(isTimeout(e) ? t.uploadCv.timeoutError : e instanceof Error ? e.message : t.uploadCv.genericError);
    }
    finally {
      setIsUploading(false);
    }
  }

  return (
    <AppShell backHref="/">
      <div className="flex flex-col items-center gap-8 max-w-4xl mx-auto text-center">
        <StepIndicator activeStep={1} />

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-5xl font-bold text-(--text-primary)"
        >
          {t.uploadCv.title}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="glass-card w-full border-2 border-dashed border-(--pink) rounded-[20px] py-16 flex flex-col items-center gap-4 cursor-pointer"
        >
          <Icon icon="mdi:file-document-outline" className="w-20 h-20 text-(--accent-bg)" />
          <p className="font-black text-xl text-(--accent-bg)">
            {t.uploadCv.dragDrop}
          </p>
          <p className="font-semibold text-(--accent-bg)">
            PDF, DOCX up to {MAX_FILE_SIZE_MB}MB
          </p>
          {/* File input supporting both PDF and DOCX formats */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleInputChange}
            className="hidden"
          />
        </motion.div>

        {file && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-card w-full border-2 border-(--pink) rounded-[20px] p-4 flex flex-col gap-4 text-left"
          >
            <div className="flex items-center gap-4">
              {/* Dynamic file icon depending on whether file is PDF or DOCX */}
              <Icon
                icon={
                  file.name.toLowerCase().endsWith(".docx")
                    ? "mdi:file-word-box"
                    : "mdi:file-pdf-box"
                }
                className="w-12 h-12 text-(--accent-bg) shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-(--text-primary) truncate">{file.name}</p>
                <p className="text-sm text-(--text-secondary)">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              <motion.button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                aria-label={t.uploadCv.removeCv}
                title={t.uploadCv.removeCv}
                whileHover={!isUploading ? { scale: 1.05 } : undefined}
                whileTap={!isUploading ? { scale: 0.95 } : undefined}
                className="flex shrink-0 items-center gap-1.5 rounded-[20px] border-2 border-(--accent-2) px-3 py-1.5 text-sm font-bold text-(--accent-2) disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icon icon="mdi:trash-can-outline" className="h-5 w-5" />
                <span className="hidden sm:inline">{t.uploadCv.remove}</span>
              </motion.button>
            </div>

            {isUploading && (
              <>
                <p className="font-light text-(--text-primary)">
                  {t.uploadCv.reading}
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
                  {t.uploadCv.cvRead(skillCount)}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {error && (
          <p className="glass-card w-full rounded-[20px] border-2 border-(--accent-2) p-4 text-left font-semibold text-(--text-primary)">
            {error}
          </p>
        )}

        <motion.button
          type="button"
          disabled={!file || isUploading}
          onClick={skillCount !== null ? () => router.push("/select_role") : handleContinue}
          whileHover={file && !isUploading ? { scale: 1.03 } : undefined}
          whileTap={file && !isUploading ? { scale: 0.97 } : undefined}
          className="bg-(--accent) text-(--on-accent) rounded-[20px] px-10 py-3.5 font-black text-xl flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isUploading ? t.uploadCv.analysing : skillCount !== null ? t.uploadCv.selectRole : t.uploadCv.continue}
          <Icon icon="mdi-light:arrow-up" className="w-6 h-6 rotate-90" />
        </motion.button>

        <div className="flex items-center gap-2 text-(--text-primary)">
          <Icon icon="gala:secure" className="w-6 h-6" />
          <span className="font-black">{t.common.secureData}</span>
        </div>
      </div>
    </AppShell>
  );
}