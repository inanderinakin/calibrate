import type { DemandedSkill } from "@/lib/types";

const MAX_PER_COLUMN = 5;

function SkillColumn({
  title,
  color,
  skills,
}: {
  title: string;
  color: string;
  skills: DemandedSkill[];
}) {
  return (
    <div className="flex-1 flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-1.5 text-base font-black text-(--text-primary)">
        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
        {title}
      </div>
      {skills.length === 0 ? (
        <p className="text-sm text-(--text-muted)">None right now</p>
      ) : (
        <div className="flex flex-col gap-2">
          {skills.slice(0, MAX_PER_COLUMN).map((gap, i) => {
            const percent = Math.round(gap.demand_percentage * 100);
            return (
              <div key={gap.skill} className="flex items-center gap-3">
                <span className="flex-1 min-w-0 truncate text-base text-(--text-primary)">
                  {i + 1}. {gap.skill}
                </span>
                <span className="w-12 shrink-0 text-right text-base font-black text-(--text-primary)">
                  {percent}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TrendingSkillsChart({ skills }: { skills: DemandedSkill[] }) {
  const emerging = skills.filter((g) => g.trend === "Emerging");
  const fading = skills.filter((g) => g.trend === "Fading");

  if (emerging.length === 0 && fading.length === 0) {
    return (
      <p className="text-(--text-secondary)">Not enough data yet</p>
    );
  }

  return (
    <div className="flex gap-6 w-full min-h-0">
      <SkillColumn title="Emerging" color="#2f9e44" skills={emerging} />
      <div className="w-px bg-(--hover-bg)" />
      <SkillColumn title="Fading" color="#c0392b" skills={fading} />
    </div>
  );
}
