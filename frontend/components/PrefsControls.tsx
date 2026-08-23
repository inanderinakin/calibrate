"use client";

import { Icon } from "@/components/Icon";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

// The sidebar has the same two controls, but styled for the burgundy panel it sits
// on. These are for the signed-out pages, which have no sidebar and a page-coloured
// background. The flag is the whole control, so aria-label carries the language name.
const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
] as const;

export default function PrefsControls({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const t = getTranslations(language);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="glass flex h-10 items-center gap-0.5 rounded-full px-1">
        {LANGUAGES.map(({ code, label, flag }) => (
          <button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            aria-label={label}
            aria-pressed={language === code}
            className={`
              rounded-full px-3 py-1 text-base leading-4 transition-colors
              ${language === code
                ? "bg-[var(--accent-bg)] text-[var(--accent-text)]"
                : "text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"}
            `}
          >
            {flag}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "light" ? t.settings.darkMode : t.settings.lightMode}
        className="glass flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-primary)] transition-colors hover:text-[var(--accent-2)]"
      >
        <Icon
          icon={theme === "dark" ? "solar:moon-linear" : "solar:sun-2-linear"}
          className={`h-5 w-5 ${theme === "dark" ? "rotate-[40deg]" : ""}`}
        />
      </button>
    </div>
  );
}
