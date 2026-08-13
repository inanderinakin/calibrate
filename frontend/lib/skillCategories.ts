import type { Language } from "@/contexts/LanguageContext";

// Turkish labels for the categories our own backend assigns in
// backend/app/skills.py (SKILL_CATEGORIES). These are our own English
// strings, not raw ESCO taxonomy labels, so we own the translation.
// Categories that come straight from the raw ESCO dataset (via
// normalize.py) aren't in this map and are shown as-is in English —
// same as the rest of that raw/data-driven content.
const CATEGORY_LABELS_TR: Record<string, string> = {
  "computer programming": "Bilgisayar Programlama",
  "software and applications development and analysis": "Yazılım ve Uygulama Geliştirme",
  "query languages": "Sorgu Dilleri",
  "database management systems": "Veritabanı Yönetim Sistemleri",
  "database management": "Veritabanı Yönetimi",
  "data processing": "Veri İşleme",
  "machine learning": "Makine Öğrenmesi",
  "cloud services": "Bulut Hizmetleri",
  "containerization": "Konteynerizasyon",
  "infrastructure automation": "Altyapı Otomasyonu",
  "continuous integration": "Sürekli Entegrasyon",
  "version control": "Sürüm Kontrolü",
  "operating systems": "İşletim Sistemleri",
  "monitoring": "İzleme",
  "software testing": "Yazılım Testi",
  "programming languages": "Programlama Dilleri",
  "enterprise resource planning": "Kurumsal Kaynak Planlama",
  "it support": "IT Desteği",
};

export function getCategoryLabel(category: string, language: Language): string {
  if (language !== "tr") return category;
  return CATEGORY_LABELS_TR[category.trim().toLowerCase()] ?? category;
}
