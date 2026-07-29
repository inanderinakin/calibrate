export type Trend = "Emerging" | "Stable" | "Fading";

export interface NormalizedSkill {
  skill: string;
  esco_category: string;
}

export interface MatchData {
  matched_demanded: number;
  total_demanded: number;
  ratio: number;
}

export interface Gap {
  skill: string;
  esco_category: string;
  closest_cv_skill: string | null;
  demand_percentage: number;
  trend: Trend;
}

export interface GapResult {
  target_roles: string[];
  gaps: Record<string, Gap[]>;
  matched_data: Record<string, MatchData>;
}

export interface Resource {
  title: string;
  url: string;
  type: "documentation" | "video" | "course";
  language: "tr" | "en";
}

export interface Recommendation {
  rank: number;
  skill: string;
  esco_category: string;
  reason: string;
  trend: Trend;
  closest_cv_skill: string | null;
  resources: Resource[];
}

export interface Report {
  target_roles: string[];
  summary: string;
  recommendations: Recommendation[];
}
