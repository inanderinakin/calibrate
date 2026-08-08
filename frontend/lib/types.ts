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

export interface DemandedSkill {
  skill: string;
  esco_category: string;
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

export interface TrendSource {
  baseline_count: number;
  baseline_total: number;
  baseline_share: number;
  recent_count: number;
  recent_total: number;
  recent_share: number;
  change: number;
  z: number;
  label: Trend;
}

export interface TrendSkill {
  skill: string;
  trend: Trend;
  confidence: "confirmed" | "directional";
  demand_percentage: number;
  change: number;
  sources: Record<string, TrendSource>;
}

export interface RoleTrend {
  weeks: string[];
  series: Record<string, number[]>;
}

export interface TrendsPayload {
  baseline_month: string;
  recent_month: string;
  sources: string[];
  skills: TrendSkill[];
  weeks: string[];
  series: Record<string, number[]>;
  roles?: Record<string, RoleTrend>;
}
