import { turkishNumberSuffix } from "@/lib/turkishNumberSuffix";

export const trendChart = {
  en: {
    loading: "Loading market trends…",
    weekOf: "Week of",
    postingsShare: (skill: string, percent: number) => `${skill}: ${percent}% of postings`,
    shareOfPostings: (skill: string, sources: string[]) =>
      `Share of job postings mentioning ${skill}, averaged across ${sources.join(" and ")} so neither board's volume dominates.`,
  },
  tr: {
    loading: "Piyasa trendleri yükleniyor…",
    weekOf: "Hafta:",
    postingsShare: (skill: string, percent: number) => `${skill}: ilanların %${percent}'${turkishNumberSuffix(percent)}`,
    shareOfPostings: (skill: string, sources: string[]) =>
      `${skill} geçen iş ilanlarının oranı, ${sources.join(" ve ")} ortalaması alınarak — böylece tek bir site hacmiyle sonucu domine etmiyor.`,
  },
};
