/**
 * Collapse a per-role skill list into one ranking. A skill demanded by several target
 * roles appears once, at the highest demand any of those roles reported, which is the
 * same rule the missing-skills list uses.
 */
export function topByDemand<T extends { skill: string; demand_percentage: number }>(
  items: T[],
  limit: number
): T[] {
  const best = new Map<string, T>();

  for (const item of items) {
    const seen = best.get(item.skill);

    if (!seen || item.demand_percentage > seen.demand_percentage) {
      best.set(item.skill, item);
    }
  }

  return [...best.values()]
    .sort((a, b) => b.demand_percentage - a.demand_percentage)
    .slice(0, limit);
}
