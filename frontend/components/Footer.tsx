"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

export default function Footer({ className = "" }: { className?: string }) {
  const { language } = useLanguage();
  const t = getTranslations(language).legal.footer;

  return (
    <footer className={`flex flex-col items-center justify-between gap-3 py-6 text-[13px] text-(--text-muted) sm:flex-row ${className}`}>
      <p>{t.note}</p>

      <nav className="flex items-center gap-5">
        <Link href="/privacy" className="underline underline-offset-2 hover:text-(--text-primary)">
          {t.privacy}
        </Link>

        <Link href="/terms" className="underline underline-offset-2 hover:text-(--text-primary)">
          {t.terms}
        </Link>

        <Link href="/contact" className="underline underline-offset-2 hover:text-(--text-primary)">
          {t.contact}
        </Link>
      </nav>
    </footer>
  );
}
