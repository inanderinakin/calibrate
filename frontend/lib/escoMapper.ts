export const ESCO_SKILL_MAP: Record<string, string> = {
  // 1. Git / Sürüm Kontrolü
  "use configuration management systems": "Git",
  "configuration management systems": "Git",

  // 2. Nesne Yönelimli Programlama (OOP)
  "use object-oriented programming": "Object-Oriented Programming (OOP)",

  // 3. Veritabanı Yönetimi / SQL
  "manage database control systems": "SQL / Database Management",

  // 4. Agile / Scrum Metodolojisi
  "apply agile project management methodology": "Agile / Scrum",

  // 5. REST API / Web Servisleri
  "integrate web application interface software": "REST APIs",

  // 6. CI/CD / DevOps Süreçleri
  "manage continuous integration systems": "CI/CD / DevOps",

  // 7. Yazılım Testi / QA
  "perform software unit testing": "Software Testing / QA"
};

export const getDisplaySkillName = (escoSkill: string): string => {
  if (!escoSkill) return "";
  const key = escoSkill.trim().toLowerCase();
  
  const matchedKey = Object.keys(ESCO_SKILL_MAP).find(
    (k) => k.toLowerCase() === key
  );

  return matchedKey ? ESCO_SKILL_MAP[matchedKey] : escoSkill;
};