import { turkishNumberSuffix } from "@/lib/turkishNumberSuffix";

export const trendChart = {
  en: {
    loading: "Loading market trends…",
    weekOf: "Week of",
    chartLabel: (skill: string, weeks: number) =>
      `Weekly trend for ${skill} over ${weeks} weeks. Use the left and right arrow keys to read each week.`,
    postingsShare: (skill: string, percent: number) => `${skill}: ${percent}% of postings`,
    shareOfPostings: (skill: string, sources: string[]) =>
      `Share of job postings mentioning ${skill}, averaged across ${sources.join(" and ")} so neither board's volume dominates.`,
    roleShare: (skill: string, percent: number, role: string) =>
      `${percent}% of ${role} postings mentioned ${skill}`,
    roleCaption: (skill: string, role: string) =>
      `Share of ${role} postings that mention ${skill}, counted over everything scraped up to each week. The line settles as the sample grows, so treat the slope as our estimate firming up rather than the market moving. The last point is the ${skill} figure shown above.`,
  },
  tr: {
    loading: "Piyasa trendleri yükleniyor…",
    weekOf: "Hafta:",
    chartLabel: (skill: string, weeks: number) =>
      `${skill} için ${weeks} haftalık trend. Her haftayı okumak için sol ve sağ ok tuşlarını kullanın.`,
    postingsShare: (skill: string, percent: number) => `${skill}: ilanların %${percent}'${turkishNumberSuffix(percent)}`,
    shareOfPostings: (skill: string, sources: string[]) =>
      `${skill} geçen iş ilanlarının oranı, ${sources.join(" ve ")} ortalaması alınarak, böylece tek bir site hacmiyle sonucu domine etmiyor.`,
    roleShare: (skill: string, percent: number, role: string) =>
      `${role} ilanlarının %${percent}'${turkishNumberSuffix(percent)} ${skill} içeriyor`,
    roleCaption: (skill: string, role: string) =>
      `${role} ilanlarının ${skill} geçen oranı, her haftaya kadar taranan tüm ilanlar üzerinden hesaplandı. Örneklem büyüdükçe çizgi oturur; bu yüzden eğimi piyasanın hareketi değil, tahminimizin netleşmesi olarak okuyun. Son nokta, yukarıda gösterilen ${skill} değeridir.`,
  },
};
