"use client";

import Link from "next/link";
import { ReactNode } from "react";
import Footer from "@/components/Footer";
import PrefsControls from "@/components/PrefsControls";

export default function LegalPage({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-6 py-8 md:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col">
        <div className="mb-10 flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-black tracking-[-0.03em] text-(--text-primary)">
            Calibrate
          </Link>

          <PrefsControls />
        </div>

        <div className="flex-1">{children}</div>

        <Footer className="mt-16 border-t border-(--border-color)/30" />
      </div>
    </main>
  );
}
