"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import StepIndicator from "@/components/StepIndicator";
import {
  FileIcon,
  SmallFileIcon,
  CheckIcon,
  ArrowIcon,
  SecureIcon,
  AmazonIcon,
} from "@/components/icons/Icons";

export default function UploadCvPage() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const handleFile = (selectedFile: File) => {
    setFile(selectedFile);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  };

  return (
    <div data-theme={theme} className="flex min-h-screen bg-bg-light dark:bg-bg-dark">
      <Sidebar />

      <main className="flex-1 flex flex-col items-center px-8 py-10 relative">
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="absolute top-6 right-8 text-sm px-4 py-2 rounded-full border border-primary-light dark:border-cream text-primary-light dark:text-cream"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        <StepIndicator currentStep={1} />

        <h1 className="font-bold text-[55px] text-title-light dark:text-title-dark mb-8">
          Upload Your CV
        </h1>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`w-full max-w-[830px] h-[314px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors
            ${
              isDragging
                ? "border-primary-light dark:border-sidebar-dark bg-[#d8a7a7]/10"
                : "border-[#d8a7a7] dark:border-sidebar-dark"
            }`}
        >
          <FileIcon className="size-[100px] mb-2" />
          <p className="font-bold text-[28px] text-primary-light dark:text-accent-dark">
            Drag & drop your CV here
          </p>
          <p className="font-medium text-[21px] text-primary-light/80 dark:text-accent-dark/80">
            PDF or DOCX up to 15MB
          </p>

          <input
            id="file-input"
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) handleFile(selected);
            }}
          />
          <label
            htmlFor="file-input"
            className="mt-2 text-sm underline cursor-pointer text-primary-light dark:text-accent-dark"
          >
            or browse files
          </label>
        </div>

        {file && (
          <>
            <div className="w-full max-w-[833px] h-[90px] border-2 border-[#d8a7a7] dark:border-sidebar-dark rounded-2xl flex items-center px-6 mt-6">
              <SmallFileIcon className="size-[50px] mr-4" />
              <div className="flex-1">
                <p className="font-light text-base text-black dark:text-cream">
                  {file.name}
                </p>
                <p className="font-light text-xs text-black/60 dark:text-cream/60">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {progress === 100 && <CheckIcon className="size-10" />}
            </div>

            <div className="w-full max-w-[833px] mt-4">
              <div className="w-full h-[15px] bg-[#d9d9d9] dark:bg-cream/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-light dark:bg-accent-dark transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="font-bold text-[23px] text-black dark:text-cream mt-1">
                Uploading ... {progress}%
              </p>
            </div>
          </>
        )}

        <button
          disabled={progress < 100}
          className="mt-8 w-full max-w-[500px] h-[85px] rounded-2xl bg-primary-light dark:bg-primary-dark text-cream font-bold text-[32px]
            transition-all duration-200 flex items-center justify-center gap-3
            enabled:hover:bg-primary-light/85 enabled:hover:scale-[1.02] enabled:hover:shadow-lg
            dark:enabled:hover:bg-primary-dark/85
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
        >
          Continue <ArrowIcon className="size-8" />
        </button>

        <p className="font-black text-[21px] text-black dark:text-cream mt-4 flex items-center gap-2">
          <SecureIcon className="size-4" />
          Your data is secure and private
        </p>

        <div className="mt-6 text-center">
          <p className="font-black text-[14px] text-black dark:text-cream">
            TRUSTED BY PROFESSIONALS
          </p>
          <AmazonIcon className="size-24 mx-auto mt-1" />
        </div>
      </main>
    </div>
  );
}
