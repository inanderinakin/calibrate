"use client";

import { useEffect, useMemo, useRef, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import AppShell from "@/components/AppShell";
import StepIndicator from "@/components/StepIndicator";
import SuggestInput from "@/components/SuggestInput";
import { getSkillCatalog, isTimeout, persistSession, uploadCv } from "@/lib/api";
import { session } from "@/lib/session";
import { useHoldToConfirm } from "@/lib/useHoldToConfirm";
import { useRestoreAnalysis } from "@/lib/useRestoreAnalysis";
import { getDisplaySkillName } from "@/lib/escoMapper";
import type { NormalizedSkill } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const HOLD_TO_REMOVE_MS = 2000;
const USER_ADDED_CATEGORY = "added by you";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadCvPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = getTranslations(language);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The skills on file are the page's real state: while there are any, this is
  // a record of the CV we hold rather than a request for a new one.
  const [skills, setSkills] = useState<NormalizedSkill[]>([]);
  const [cvName, setCvName] = useState<string | null>(null);
  const [cvSize, setCvSize] = useState<number | null>(null);
  const [cvType, setCvType] = useState<string | null>(null);
  const [cvUploadedAt, setCvUploadedAt] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draftSkill, setDraftSkill] = useState("");
  const [catalog, setCatalog] = useState<NormalizedSkill[]>([]);

  const restored = useRestoreAnalysis();
  const hasCv = skills.length > 0;
  const reduceMotion = useReducedMotion();

  // One of three, never two: the dropzone hands over to the reader, the reader hands
  // over to the results. AnimatePresence needs them exclusive to sequence the swap.
  const phase = hasCv ? "done" : isUploading ? "analysing" : "pick";

  useEffect(() => {
    if (!restored) return;

    setSkills(session.getCvSkills() ?? []);
    setCvName(session.getCvFilename());
    setCvSize(session.getCvSize());
    setCvType(session.getCvType());
    setCvUploadedAt(session.getCvUploadedAt());
  }, [restored]);

  useEffect(() => {
    getSkillCatalog().then(setCatalog).catch(() => {});
  }, []);

  const suggestions = useMemo(() => {
    const taken = new Set(skills.map((entry) => entry.skill));
    return catalog.map((entry) => entry.skill).filter((name) => !taken.has(name));
  }, [catalog, skills]);

  function persist(next: NormalizedSkill[]) {
    setSkills(next);
    session.setCvSkills(next);
    // The gaps and roadmap were built from the old list, so they no longer describe it.
    session.clearDerived();
    persistSession().catch(() => {});
  }

  function removeSkill(name: string) {
    setError(null);
    persist(skills.filter((entry) => entry.skill !== name));
  }

  function addSkill() {
    const name = draftSkill.trim();
    if (!name) return;

    const already = skills.some(
      (entry) => entry.skill.toLocaleLowerCase(language) === name.toLocaleLowerCase(language)
    );

    if (already) {
      setError(t.uploadCv.duplicateSkill);
      return;
    }

    const known = catalog.find((entry) => entry.skill === name);

    setError(null);
    persist([...skills, known ?? { skill: name, esco_category: USER_ADDED_CATEGORY }]);
    setDraftSkill("");
    setAdding(false);
  }

  function handleFile(f: File | null) {
    if (!f) return;

    if (f.size > MAX_FILE_SIZE_BYTES) {
      setError(t.uploadCv.fileSizeError);
      return;
    }

    const isValidDocx =
      f.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      f.name.toLowerCase().endsWith(".docx");

    const isValidPdf =
      f.type === "application/pdf" ||
      f.name.toLowerCase().endsWith(".pdf");

    if (!isValidDocx && !isValidPdf) {
      setError(t.uploadCv.invalidFileType);
      return;
    }

    setError(null);
    setFile(f);
  }

  function clearSelection() {
    setFile(null);
    setError(null);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0] ?? null);
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    // Crossing onto the icon or the label counts as leaving the zone, which
    // strobes the border. Only let go once the pointer is really outside.
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function removeCv() {
    setRemoving(true);
    setError(null);

    session.clear();

    try {
      await persistSession();
    }
    catch {
      setError(t.uploadCv.removeFailed);
    }

    setSkills([]);
    setCvName(null);
    setCvSize(null);
    setCvType(null);
    setCvUploadedAt(null);
    clearSelection();
    setRemoving(false);
  }

  const hold = useHoldToConfirm(HOLD_TO_REMOVE_MS, removeCv);

  async function handleUpload() {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const data = await uploadCv(file);
      const found: NormalizedSkill[] = data.skills ?? [];

      if (found.length === 0) {
        throw new Error(t.uploadCv.noSkillsFound);
      }

      session.setCvSkills(found);
      session.setCvFilename(data.cv_filename ?? file.name);
      if (data.cv_size) session.setCvSize(data.cv_size);
      if (data.cv_type) session.setCvType(data.cv_type);
      if (data.cv_uploaded_at) session.setCvUploadedAt(data.cv_uploaded_at);
      session.clearDerived();
      persistSession().catch(() => {});

      setSkills(found);
      setCvName(data.cv_filename ?? file.name);
      setCvSize(data.cv_size ?? null);
      setCvType(data.cv_type ?? null);
      setCvUploadedAt(data.cv_uploaded_at ?? null);
      setFile(null);
    }
    catch (e) {
      setError(isTimeout(e) ? t.uploadCv.timeoutError : e instanceof Error ? e.message : t.uploadCv.genericError);
    }
    finally {
      setIsUploading(false);
    }
  }

  // Accounts that uploaded before we kept this only have the name, so anything
  // missing just drops out of the line.
  const fileMeta = [
    cvType,
    cvSize ? formatBytes(cvSize) : null,
    cvUploadedAt
      ? t.uploadCv.uploadedOn(new Date(cvUploadedAt).toLocaleDateString(language))
      : null,
  ].filter(Boolean);

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
          {hasCv ? t.uploadCv.onFileTitle : t.uploadCv.title}
        </motion.h1>

        {hasCv && (
          <p className="-mt-4 text-(--text-secondary)">{t.uploadCv.onFileSubtitle}</p>
        )}

        <AnimatePresence mode="wait">
        {phase === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="glass-card w-full rounded-[20px] border-2 border-(--pink) p-6 text-left"
          >
            <div className="flex items-start gap-4">
              <Icon icon="mdi-light:file" className="h-16 w-16 shrink-0 text-(--accent-bg)" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-bold text-(--text-primary)">
                  {cvName ?? t.uploadCv.onFileFallbackName}
                </p>
                {fileMeta.length > 0 && (
                  <p className="mt-0.5 text-sm text-(--text-muted)">{fileMeta.join(" · ")}</p>
                )}
                <p className="mt-1 text-(--text-secondary)">{t.uploadCv.skillsFound(skills.length)}</p>
              </div>

              <button
                type="button"
                onPointerDown={() => hold.start()}
                onPointerUp={hold.stop}
                onPointerLeave={hold.stop}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    hold.start(true);
                  }
                }}
                onKeyUp={hold.stop}
                onBlur={hold.stopOnBlur}
                disabled={removing}
                aria-label={t.uploadCv.holdToRemove}
                className="relative shrink-0 overflow-hidden rounded-[20px] border-2 border-(--text-primary) px-5 py-3 font-bold text-(--text-primary) disabled:opacity-40"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 bg-(--text-primary)/20"
                  style={{ width: `${hold.progress * 100}%` }}
                />
                <span className="relative flex items-center gap-2">
                  <Icon icon="mdi:trash-can-outline" className="h-5 w-5" />
                  {removing
                    ? t.uploadCv.removing
                    : hold.progress > 0
                      ? t.uploadCv.holdingToRemove
                      : t.uploadCv.holdToRemove}
                </span>
              </button>
            </div>

            <div className="mt-6 border-t border-(--border-color)/20 pt-5">
              <p className="font-bold text-(--text-primary)">{t.uploadCv.skillsTitle}</p>
              <p className="mt-0.5 text-sm text-(--text-muted)">{t.uploadCv.skillsHint}</p>

              <motion.ul
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: reduceMotion ? 0 : 0.035 } } }}
                className="mt-4 flex flex-wrap gap-2"
              >
                {skills.map((entry) => (
                  <motion.li
                    key={entry.skill}
                    variants={{
                      hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 },
                      show: { opacity: 1, y: 0, scale: 1 },
                    }}
                    className="group relative"
                  >
                    <span className="flex items-center rounded-lg border border-(--border-color)/40 px-3 py-1.5 text-sm font-semibold text-(--text-primary)">
                      {getDisplaySkillName(entry.skill)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSkill(entry.skill)}
                      aria-label={t.uploadCv.removeSkill(getDisplaySkillName(entry.skill))}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-(--danger) text-(--on-danger) opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Icon icon="mdi:trash-can-outline" className="h-3 w-3" />
                    </button>
                  </motion.li>
                ))}

                {!adding && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setAdding(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-dashed border-(--accent)/40 px-3 py-1.5 text-sm font-semibold text-(--accent-2)"
                    >
                      <Icon icon="mdi:plus" className="h-4 w-4" />
                      {t.uploadCv.addSkill}
                    </button>
                  </li>
                )}
              </motion.ul>

              {adding && (
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="min-w-[240px] flex-1">
                    <SuggestInput
                      id="add-skill"
                      label={t.uploadCv.addSkillLabel}
                      value={draftSkill}
                      onChange={setDraftSkill}
                      suggestions={suggestions}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addSkill}
                    className="rounded-lg bg-(--accent) px-5 py-2.5 font-bold text-(--on-accent)"
                  >
                    {t.uploadCv.add}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAdding(false); setDraftSkill(""); setError(null); }}
                    className="rounded-lg border border-(--accent)/20 px-5 py-2.5 font-bold text-(--text-primary)"
                  >
                    {t.uploadCv.cancel}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {phase === "analysing" && (
          <motion.div
            key="analysing"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="glass-card w-full rounded-[20px] border-2 border-(--pink) py-14 flex flex-col items-center gap-5"
          >
            <Icon icon="mdi:file-document-outline" className="h-20 w-20 text-(--accent-bg)" />

            <p className="font-black text-xl text-(--accent-bg)">{t.uploadCv.analysing}</p>

            {file && (
              <p className="max-w-[80%] truncate text-sm text-(--text-muted)">{file.name}</p>
            )}

            <div className="h-2.5 w-2/3 overflow-hidden rounded-full bg-(--hover-bg)">
              <div className="h-full w-1/3 rounded-full bg-(--accent) animate-indeterminate" />
            </div>

            <p className="font-light text-(--text-primary)">{t.uploadCv.reading}</p>
          </motion.div>
        )}

        {phase === "pick" && (
          <motion.div
            key="pick"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`glass-card w-full border-2 rounded-[20px] py-16 flex flex-col items-center gap-4 cursor-pointer transition-colors ${
              dragging
                ? "border-solid border-(--accent-bg)"
                : "border-dashed border-(--pink) hover:border-(--accent-bg)/60"
            }`}
          >
            <Icon
              icon="mdi:file-document-outline"
              className={`w-20 h-20 text-(--accent-bg) transition-transform ${dragging ? "scale-110" : ""}`}
            />
            <p className="font-black text-xl text-(--accent-bg)">
              {t.uploadCv.dragDrop}
            </p>
            <p className="font-semibold text-(--accent-bg)">
              {t.uploadCv.pdfUpTo}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleInputChange}
              className="hidden"
            />
          </motion.div>
        )}
        </AnimatePresence>

        {hasCv && (
          <p className="-mt-4 text-sm text-(--text-muted)">{t.uploadCv.removeCost}</p>
        )}

        {!hasCv && cvName && (
          <p className="-mt-4 text-sm text-(--text-muted)">{t.uploadCv.noSkillsLeft}</p>
        )}

        {phase === "pick" && file && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-card w-full border-2 border-(--pink) rounded-[20px] p-4 flex flex-col gap-4 text-left"
          >
            <div className="flex items-center gap-4">
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
                onClick={clearSelection}
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

          </motion.div>
        )}

        {error && (
          <p className="glass-card w-full rounded-[20px] border-2 border-(--accent-2) p-4 text-left font-semibold text-(--text-primary)">
            {error}
          </p>
        )}

        <motion.button
          type="button"
          disabled={hasCv ? removing : !file || isUploading}
          onClick={hasCv ? () => router.push("/select_role") : handleUpload}
          whileHover={hasCv || (file && !isUploading) ? { scale: 1.03 } : undefined}
          whileTap={hasCv || (file && !isUploading) ? { scale: 0.97 } : undefined}
          className="bg-(--accent) text-(--on-accent) rounded-[20px] px-10 py-3.5 font-black text-xl flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isUploading ? t.uploadCv.analysing : t.uploadCv.continue}
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
