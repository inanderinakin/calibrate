"use client";

import { useMemo, useState } from "react";
import type { TrendsPayload } from "@/lib/types";

const RANGES = [
  { label: "30D", weeks: 4 },
  { label: "90D", weeks: 13 },
];

const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 16, right: 60, bottom: 34, left: 46 };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function weekLabel(week: string) {
  const [, month, day] = week.split("-");
  return `${MONTHS[Number(month) - 1]} ${Number(day)}`;
}

function axisScale(peak: number) {
  const step = [0.01, 0.02, 0.05, 0.1, 0.2].find((candidate) => peak / candidate <= 5) ?? 0.25;
  const max = Math.max(step, Math.ceil(peak / step) * step);
  const ticks = [];
  for (let value = 0; value <= max + 1e-9; value += step) {
    ticks.push(Number(value.toFixed(4)));
  }
  return { max, ticks };
}

function bareName(value: string) {
  return value.toLowerCase().replace(/\s*\(.*?\)\s*/g, " ").trim();
}

export default function TrendingSkillsChart({
  data,
  missing,
}: {
  data: TrendsPayload | null;
  missing?: string[];
}) {
  const [skill, setSkill] = useState<string | null>(null);
  const [range, setRange] = useState(RANGES[1].label);
  const [hover, setHover] = useState<number | null>(null);

  const skills = useMemo(() => {
    if (!data) return [];
    const all = Object.keys(data.series).sort();
    if (!missing?.length) return all;

    const wanted = new Set(missing.map(bareName));
    const yours = all.filter((term) => wanted.has(bareName(term)));
    return yours.length ? yours : all;
  }, [data, missing]);

  const busiest = useMemo(() => {
    if (!data) return null;
    const latest = (term: string) => data.series[term]?.[data.series[term].length - 1] ?? 0;
    return [...skills].sort((a, b) => latest(b) - latest(a))[0] ?? null;
  }, [data, skills]);

  const selected = skill && data?.series[skill] ? skill : busiest;

  if (!data || !selected) {
    return <p className="text-(--text-secondary)">Loading market trends…</p>;
  }

  const span = RANGES.find((entry) => entry.label === range)?.weeks ?? 13;
  const weeks = data.weeks.slice(-span);
  const values = data.series[selected].slice(-span);

  const { max, ticks } = axisScale(Math.max(...values));
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (values.length === 1 ? innerW / 2 : (innerW * i) / (values.length - 1));
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const active = hover ?? values.length - 1;
  const badge = data.skills.find((entry) => entry.skill === selected);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select
            value={selected}
            onChange={(event) => setSkill(event.target.value)}
            className="rounded-[10px] border border-black/10 bg-(--input-bg) px-3 py-2 text-sm text-(--text-primary)"
          >
            {skills.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {badge && (
            <span className="rounded-[6px] bg-(--hover-bg) px-2 py-1 text-xs font-bold text-(--text-primary)">
              {badge.trend} {badge.change > 0 ? "+" : ""}{Math.round(badge.change * 100)}%
            </span>
          )}
        </div>

        <div className="flex overflow-hidden rounded-[10px] border border-black/10">
          {RANGES.map((entry) => (
            <button
              key={entry.label}
              onClick={() => { setRange(entry.label); setHover(null); }}
              className={
                entry.label === range
                  ? "bg-(--accent) px-4 py-2 text-sm font-bold text-(--on-accent)"
                  : "px-4 py-2 text-sm text-(--text-primary)"
              }
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 10}
                y={y(tick) + 4}
                textAnchor="end"
                className="fill-(--text-muted)"
                fontSize={12}
              >
                {Math.round(tick * 100)}%
              </text>
            </g>
          ))}

          {weeks.map((week, i) => (
            <text
              key={week}
              x={x(i)}
              y={HEIGHT - 10}
              textAnchor="middle"
              className="fill-(--text-muted)"
              fontSize={12}
            >
              {weekLabel(week)}
            </text>
          ))}

          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="var(--chart-grid)"
              strokeWidth={1}
            />
          )}

          <polyline
            points={points}
            fill="none"
            stroke="var(--chart-line)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {values.map((v, i) => (
            <circle
              key={weeks[i]}
              cx={x(i)}
              cy={y(v)}
              r={i === active ? 5 : 4}
              fill="var(--chart-line)"
              stroke="var(--card-bg)"
              strokeWidth={2}
            />
          ))}

          <text
            x={WIDTH - PAD.right + 10}
            y={y(values[values.length - 1]) + 4}
            className="fill-(--text-primary)"
            fontSize={13}
            fontWeight={700}
          >
            {Math.round(values[values.length - 1] * 100)}%
          </text>

          {values.map((v, i) => (
            <rect
              key={`hit-${weeks[i]}`}
              x={x(i) - innerW / (values.length * 2)}
              y={PAD.top}
              width={innerW / values.length}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 rounded-[10px] bg-(--card-bg) px-3 py-2 text-xs shadow-lg ring-1 ring-black/10"
            style={{ left: `${(x(hover) / WIDTH) * 100}%`, top: 0 }}
          >
            <div className="font-bold text-(--text-primary)">Week of {weekLabel(weeks[hover])}</div>
            <div className="text-(--text-muted)">
              {selected}: {Math.round(values[hover] * 100)}% of postings
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-(--text-muted)">
        {`Share of job postings mentioning ${selected}, averaged across ${data.sources.join(" and ")} so neither board's volume dominates.`}
      </p>
    </div>
  );
}
