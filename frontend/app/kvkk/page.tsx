"use client";

import KvkkDocument from "@/components/KvkkDocument";
import LegalPage from "@/components/LegalPage";
import { useLanguage } from "@/contexts/LanguageContext";
import { kvkkDocuments } from "@/lib/kvkk";

export default function KvkkPage() {
  const { language } = useLanguage();
  const { aydinlatma, acikRiza } = kvkkDocuments(language);

  return (
    <LegalPage>
      <div className="flex flex-col gap-10">
        <KvkkDocument document={aydinlatma} />

        <hr className="border-(--border-color)/40" />

        <KvkkDocument document={acikRiza} />
      </div>
    </LegalPage>
  );
}
