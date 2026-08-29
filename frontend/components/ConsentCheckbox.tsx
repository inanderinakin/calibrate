"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

export default function ConsentCheckbox({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const { language } = useLanguage();
  const t = getTranslations(language).legal.consent;

  const link = "font-medium text-(--accent-2) underline underline-offset-2";

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex items-start gap-3 text-sm text-[var(--text-primary)]">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent-bg)]"
        />

        <span>
          {t.before}
          <Link href="/kvkk" target="_blank" rel="noopener noreferrer" className={link}>
            {t.privacy}
          </Link>
          {t.between}
          <Link href="/terms" target="_blank" rel="noopener noreferrer" className={link}>
            {t.terms}
          </Link>
          {t.after}
        </span>
      </label>

      <p className="pl-7 text-xs text-[var(--text-muted)]">{t.notice}</p>
    </div>
  );
}
