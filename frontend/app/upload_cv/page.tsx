"use client";

import { useRef, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import StepIndicator from "@/components/StepIndicator";
import { uploadCv } from "@/lib/api";
import { session } from "@/lib/session";
import type { NormalizedSkill } from "@/lib/types";

export default function UploadCvPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    setError(null);
    setFile(f);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0] ?? null);
  }

  function handleRemove() {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0] ?? null);
  }

 async function handleContinue() {
  if (!file) return;

  setIsUploading(true);
  setError(null);
  setProgress(0);

  // The backend reads the CV synchronously and cannot report progress, so we
  // track the reading process client-side in near-real-time: the bar creeps up
  // while the CV text is being extracted and jumps to 100% the moment the
  // response arrives.
  const timer = setInterval(() => {
    setProgress((current) =>
      current >= 90 ? current : Math.min(90, current + Math.random() * 6 + 2)
    );
  }, 150);

  try {
    const data = await uploadCv(file);

    const skills: NormalizedSkill[] = data.skills ?? [];

    if (skills.length === 0) {
      throw new Error(
        "We couldn't read any skills from that CV. Try another file."
      );
    }

    clearInterval(timer);
    setProgress(100);

    session.setCvSkills(skills);

    setTimeout(() => router.push("/select_role"), 600);
  } catch (e) {
    clearInterval(timer);
    setError(
      e instanceof Error
        ? e.message
        : "Something went wrong. Please try again."
    );
  } finally {
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
          Upload Your CV
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
        </motion.div>

        {file && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-card w-full border-2 border-(--pink) rounded-[20px] p-4 flex flex-col gap-4 text-left"
          >
            <div className="flex items-center gap-4">
              <Icon icon="mdi:file-pdf-box" className="w-12 h-12 text-(--accent-bg) shrink-0" />
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
                aria-label="Remove selected CV"
                whileHover={!isUploading ? { scale: 1.05 } : undefined}
                whileTap={!isUploading ? { scale: 0.95 } : undefined}
                className="flex shrink-0 items-center gap-1.5 rounded-[20px] border-2 border-(--accent-2) px-3 py-1.5 text-sm font-bold text-(--accent-2) disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icon icon="mdi:trash-can-outline" className="h-5 w-5" />
                <span className="hidden sm:inline">Remove</span>
              </motion.button>
            </div>

            {isUploading && (
              <>
                <p className="font-light text-(--text-primary)">
                  Reading your CV — this takes a few seconds …
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-2.5 flex-1 rounded-full bg-(--hover-bg) overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-(--accent)"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm font-bold text-(--text-primary)">
                    {Math.round(progress)}%
                  </span>
                </div>
              </>
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
          onClick={handleContinue}
          whileHover={file && !isUploading ? { scale: 1.03 } : undefined}
          whileTap={file && !isUploading ? { scale: 0.97 } : undefined}
          className="bg-(--accent) text-(--on-accent) rounded-[20px] px-10 py-3.5 font-black text-xl flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isUploading ? "Analysing …" : "Continue"}
          <Icon icon="mdi-light:arrow-up" className="w-6 h-6 rotate-90" />
        </motion.button>

        <div className="flex items-center gap-2 text-(--text-primary)">
          <Icon icon="gala:secure" className="w-6 h-6" />
          <span className="font-black">Your data is secure and private</span>
        </div>
      </div>
    </AppShell>
  );
}
