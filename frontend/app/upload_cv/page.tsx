"use client";

import { useRef, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import AppShell from "@/components/AppShell";
import StepIndicator from "@/components/StepIndicator";

export default function UploadCvPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);

  function handleFile(f: File | null) {
    if (!f) return;
    setFile(f);
    // TODO: replace with real upload progress from the backend once it exists.
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 11;
      });
    }, 150);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0] ?? null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0] ?? null);
  }

  return (
    <AppShell>
      <div className="p-6 md:p-10 lg:p-14 flex flex-col items-center gap-8 max-w-4xl mx-auto text-center">
        <StepIndicator activeStep={1} />

        <h1 className="text-3xl md:text-5xl font-bold text-[var(--accent-2)]">
          Upload Your CV
        </h1>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-[var(--pink)] rounded-[20px] py-16 flex flex-col items-center gap-4 cursor-pointer bg-[var(--card-bg)]"
        >
          <div className="flex gap-4">
            <Icon icon="vscode-icons:file-type-pdf2" className="w-12 h-12" />
            <Icon icon="vscode-icons:file-type-word" className="w-12 h-12" />
          </div>
          <Icon icon="mdi-light:file" className="w-16 h-16 text-[var(--accent)]" />
          <p className="font-black text-xl text-[var(--accent)]">
            Drag &amp; drop your CV here
          </p>
          <p className="font-semibold text-[var(--accent)]/90">
            PDF or DOCX up to 15MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        {file && (
          <div className="w-full border-2 border-[var(--pink)] rounded-[20px] p-4 flex flex-col gap-4 text-left bg-[var(--card-bg)]">
            <div className="flex items-center gap-4">
              <Icon icon="mdi-light:file" className="w-12 h-12 text-[var(--accent)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--text-primary)] truncate">{file.name}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {progress >= 100 && (
                <Icon icon="material-symbols:check-circle" className="w-9 h-9 text-[var(--accent)] shrink-0" />
              )}
            </div>

            <p className="font-light text-[var(--text-primary)]">
              Uploading ... {progress}%
            </p>
            <div className="h-2.5 rounded-full bg-[var(--hover-bg)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!file || progress < 100}
          onClick={() => router.push("/select_role")}
          className="bg-[var(--accent)] text-[var(--on-accent)] rounded-[20px] px-10 py-3.5 font-black text-xl flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
          <Icon icon="mdi-light:arrow-up" className="w-6 h-6 rotate-90" />
        </button>

        <div className="flex items-center gap-2 text-[var(--text-primary)]">
          <Icon icon="gala:secure" className="w-6 h-6" />
          <span className="font-black">Your data is secure and private</span>
        </div>
      </div>
    </AppShell>
  );
}
