"use client";

import Link from "next/link";
import KvkkDocument from "@/components/KvkkDocument";
import LegalPage from "@/components/LegalPage";
import { useLanguage } from "@/contexts/LanguageContext";
import { acikRizaMetni, aydinlatmaMetni } from "@/lib/kvkk";
import { getTranslations } from "@/lib/translations";

export default function KvkkPage() {
  const { language } = useLanguage();
  const t = getTranslations(language).legal;

  return (
    <LegalPage>
      <div className="flex flex-col gap-10">
        {language === "en" && (
          <p className="rounded-[16px] border border-(--border-color) px-4 py-3 text-sm text-(--text-muted)">
            {t.kvkkTurkishOnly}
          </p>
        )}

        <KvkkDocument document={aydinlatmaMetni} />

        <hr className="border-(--border-color)/40" />

        <KvkkDocument document={acikRizaMetni} />

        <p className="text-sm text-(--text-muted)">
          {t.kvkkSeePrivacy}{" "}
          <Link href="/privacy" className="font-medium text-(--accent-2) underline underline-offset-2">
            {t.footer.privacy}
          </Link>
        </p>
      </div>
    </LegalPage>
  );
}
