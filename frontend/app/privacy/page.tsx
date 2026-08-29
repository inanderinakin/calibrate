"use client";

import LegalDocument from "@/components/LegalDocument";
import LegalPage from "@/components/LegalPage";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

export default function PrivacyPage() {
  const { language } = useLanguage();
  const t = getTranslations(language).legal.privacy;

  return (
    <LegalPage>
      <LegalDocument
        title={t.title}
        updated={t.updated}
        intro={t.intro}
        sections={t.sections}
      />
    </LegalPage>
  );
}
