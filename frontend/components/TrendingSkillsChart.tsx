"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TrendsPayload } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";
import { formatPercent } from "@/lib/turkishNumberSuffix";

const RANGES = [
  { label: "30D", weeks: 4 },
  { label: "90D", weeks: 13 },
];

const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 16, right: 60, bottom: 34, left: 46 };

function weekLabel(week: string, months: readonly string[]) {
  const [, month, day] = week.split("-");
  return `${months[Number(month) - 1]} ${Number(day)}`;
}

function axisScale(values: number[]) {
  const peak = Math.max(0, ...values);
  const step = [0.01, 0.02, 0.05, 0.1, 0.2].find((candidate) => peak / candidate <= 5) ?? 0.25;
  const max = Math.max(step, Math.ceil(peak / step) * step);

  const ticks = [];
  for (let value = 0; value <= max + 1e-9; value += step) {
    ticks.push(Number(value.toFixed(4)));
  }
  return { min: 0, max, ticks };
}

function bareName(value: string) {
  return value.toLowerCase().replace(/\s*\(.*?\)\s*/g, " ").trim();
}

export default function TrendingSkillsChart({
  data,
  missing,
  focus,
  roles,
}: {
  data: TrendsPayload | null;
  missing?: string[];
  focus?: string | null;
  roles?: string[];
}) {
  const { language } = useLanguage();
  const translations = getTranslations(language);
  const t = translations.trendChart;

  const [skill, setSkill] = useState<string | null>(null);
  const [range, setRange] = useState(RANGES[1].label);
  const [hover, setHover] = useState<number | null>(null);
  const [shown, setShown] = useState<number[]>([]);
  const [bounds, setBounds] = useState<{ min: number; max: number } | null>(null);
  const shownRef = useRef<number[]>([]);
  const boundsRef = useRef<{ min: number; max: number } | null>(null);

  const role = roles?.find((name) => data?.roles?.[name]) ?? null;

  const view = useMemo(() => {
    const entry = role ? data?.roles?.[role] : null;
    if (entry) return entry;
    return data ? { weeks: data.weeks, series: data.series } : null;
  }, [data, role]);

  const skills = useMemo(() => {
    if (!view) return [];
    const all = Object.keys(view.series).sort();
    if (!missing?.length) return all;

    const wanted = new Set(missing.map(bareName));
    const yours = all.filter((term) => wanted.has(bareName(term)));
    return yours.length ? yours : all;
  }, [view, missing]);

  const busiest = useMemo(() => {
    if (!view) return null;
    const latest = (term: string) => view.series[term]?.[view.series[term].length - 1] ?? 0;
    return [...skills].sort((a, b) => latest(b) - latest(a))[0] ?? null;
  }, [view, skills]);

  const focusKey = useMemo(() => {
    if (!focus) return null;
    const wanted = bareName(focus);
    return skills.find((term) => bareName(term) === wanted) ?? null;
  }, [focus, skills]);

  useEffect(() => {
    if (focusKey) setSkill(focusKey);
  }, [focusKey]);

  const selected = skill && view?.series[skill] ? skill : busiest;
  const span = RANGES.find((entry) => entry.label === range)?.weeks ?? 13;

  const actual = useMemo(
    () => (view && selected ? view.series[selected].slice(-span) : []),
    [view, selected, span]
  );

  const actualTotals = useMemo(
    () => (view && view.totals ? view.totals.slice(-span) : []),
    [view, span]
  );

  useEffect(() => {
    if (actual.length === 0) return;

    const from = shownRef.current;
    const to = axisScale(actual);
    const fromBounds = boundsRef.current ?? to;

    const snap =
      from.length !== actual.length ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (snap) {
      shownRef.current = actual;
      boundsRef.current = to;
      setShown(actual);
      setBounds(to);
      return;
    }

    const start = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 450);
      const eased = 1 - Math.pow(1 - t, 3);

      const next = from.map((v, i) => v + (actual[i] - v) * eased);
      const nextBounds = {
        min: fromBounds.min + (to.min - fromBounds.min) * eased,
        max: fromBounds.max + (to.max - fromBounds.max) * eased,
      };

      shownRef.current = next;
      boundsRef.current = nextBounds;
      setShown(next);
      setBounds(nextBounds);

      if (t < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [actual]);

  if (!data || !view || !selected) {
    return <p className="text-(--text-secondary)">{t.loading}</p>;
  }

  const weeks = view.weeks.slice(-span);
  const values = shown.length === actual.length ? shown : actual;

  const scale = axisScale(actual);
  const axis = bounds ?? scale;
  const ticks = scale.ticks.filter(
    (tick) => tick >= axis.min - 1e-9 && tick <= axis.max + 1e-9
  );
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (values.length === 1 ? innerW / 2 : (innerW * i) / (values.length - 1));
  const y = (v: number) =>
    PAD.top + innerH - ((v - axis.min) / (axis.max - axis.min)) * innerH;

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
              {translations.common.trend[badge.trend]} {badge.change > 0 ? "+" : ""}{formatPercent(Math.round(badge.change * 100), language)}
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
                {formatPercent(Math.round(tick * 100), language)}
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
              {weekLabel(week, translations.common.months)}
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
            {formatPercent(Math.round(actual[actual.length - 1] * 100), language)}
            {actualTotals.length > 0 && (
              <tspan className="fill-(--text-muted) font-normal text-[10px]" dx="4">
                (n={actualTotals[actualTotals.length - 1]})
              </tspan>
            )}
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
            <div className="font-bold text-(--text-primary)">{t.weekOf} {weekLabel(weeks[hover], translations.common.months)}</div>
            <div className="text-(--text-muted)">
              {role
                ? t.roleShare(selected, Math.round(actual[hover] * 100), role)
                : t.postingsShare(selected, Math.round(actual[hover] * 100))}
              {actualTotals.length > 0 && ` (n=${actualTotals[hover]})`}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-(--text-muted)">
        {role
          ? t.roleCaption(selected, role)
          : t.shareOfPostings(selected, data.sources)}
      </p>
    </div>
  );
}
