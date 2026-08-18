"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import { Skeleton } from "@/components/Skeleton";
import { getPostings } from "@/lib/api";
import { session } from "@/lib/session";
import { useRestoreAnalysis } from "@/lib/useRestoreAnalysis";
import type { Posting, PostingsPayload } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";

const PAGE_SIZE = 20;
const MODELS = ["onsite", "hybrid", "remote"] as const;

// The role patterns miss plenty of real IT titles ("Data Architect", "Bilgi
// Teknolojileri Uzmanı"), so those postings arrive unclassified rather than
// off-topic. Shown as "Other" instead of leaking the internal label.
const UNCLASSIFIED = "Unclassified";

type Sort = "newest" | "closing";

export default function PostingsPage() {
  const { language } = useLanguage();
  const t = getTranslations(language).postings;

  const [data, setData] = useState<PostingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("");
  const [city, setCity] = useState("");
  const [workModel, setWorkModel] = useState("");
  const [skill, setSkill] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);

  const [mySkills, setMySkills] = useState<string[]>([]);
  const [matchOnly, setMatchOnly] = useState(false);
  const restored = useRestoreAnalysis();

  useEffect(() => {
    if (!restored) return;
    setMySkills((session.getCvSkills() ?? []).map((entry) => entry.skill));
  }, [restored]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role, city, workModel, skill, sort, matchOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await getPostings({
        role: role || undefined,
        city: city || undefined,
        workModel: workModel || undefined,
        skill: skill || undefined,
        mySkills: matchOnly && mySkills.length ? mySkills : undefined,
        search: debouncedSearch || undefined,
        sort,
        page,
        pageSize: PAGE_SIZE,
      });
      setData(payload);
    }
    catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    }
    finally {
      setLoading(false);
    }
  }, [role, city, workModel, skill, matchOnly, mySkills, debouncedSearch, sort, page, t.error]);

  useEffect(() => {
    load();
  }, [load]);

  const numberFormat = useMemo(
    () => new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-GB"),
    [language]
  );

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "short" }),
    [language]
  );

  const hasFilters = Boolean(role || city || workModel || skill || search || matchOnly);

  function clearFilters() {
    setSearch("");
    setRole("");
    setCity("");
    setWorkModel("");
    setSkill("");
    setMatchOnly(false);
  }

  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <AppShell>
      <h1 className="text-4xl md:text-5xl font-black">{t.title}</h1>
      <p className="mt-2 text-lg font-light text-[var(--text-muted)]">
        {t.subtitle(numberFormat.format(total))}
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-3 rounded-[18px] bg-(--card-bg) p-3 shadow-lg">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl bg-[var(--hover-bg)] px-3 py-2.5">
          <Icon icon="mdi:magnify" className="h-[18px] w-[18px] shrink-0 text-[var(--icon-color)]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
          />
        </div>

        <Select value={role} onChange={setRole} label={t.allRoles}>
          {(data?.roles ?? []).map((option) => (
            <option key={option} value={option}>
              {option === UNCLASSIFIED ? t.otherRole : option}
            </option>
          ))}
        </Select>

        <Select value={city} onChange={setCity} label={t.allCities}>
          {(data?.cities ?? []).map((option) => (
            <option key={option} value={option}>
              {option === "Türkiye" ? t.nationwide : option}
            </option>
          ))}
        </Select>

        <Select value={workModel} onChange={setWorkModel} label={t.allModels}>
          {MODELS.map((option) => (
            <option key={option} value={option}>{t.models[option]}</option>
          ))}
        </Select>

        <Select value={skill} onChange={setSkill} label={t.allSkills}>
          {(data?.skills ?? []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </Select>

        <div className="ml-auto">
          <Select value={sort} onChange={(value) => setSort(value as Sort)}>
            <option value="newest">{t.sortNewest}</option>
            <option value="closing">{t.sortClosing}</option>
          </Select>
        </div>
      </div>

      {mySkills.length > 0 && (
        <motion.button
          onClick={() => setMatchOnly(!matchOnly)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          aria-pressed={matchOnly}
          className={`mt-4 flex w-full items-center gap-4 rounded-[18px] px-6 py-4 text-left shadow-lg transition ${
            matchOnly
              ? "bg-[var(--accent-bg)] text-[var(--accent-text)]"
              : "bg-(--card-bg) text-[var(--text-primary)]"
          }`}
        >
          <Icon
            icon={matchOnly ? "mdi:check-circle" : "mdi:account-star-outline"}
            className="h-8 w-8 shrink-0"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-base font-black">
              {matchOnly ? t.matchOn : t.matchOff}
            </span>
            <span className="block text-sm opacity-80">
              {t.matchHint(mySkills.length)}
            </span>
          </span>
          <span className="shrink-0 text-sm font-bold underline">
            {matchOnly ? t.matchShowAll : t.matchShowMine}
          </span>
        </motion.button>
      )}

      {error && (
        <div className="mt-6 rounded-[18px] bg-(--card-bg) p-6 shadow-lg">
          <p className="font-semibold">{t.error}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{error}</p>
          <button
            onClick={load}
            className="mt-4 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-[var(--on-accent)]"
          >
            {t.retry}
          </button>
        </div>
      )}

      {loading && !error && (
        <div className="mt-5 flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[104px] w-full rounded-[16px]" />
          ))}
        </div>
      )}

      {!loading && !error && data && data.postings.length === 0 && (
        <div className="mt-6 rounded-[18px] bg-(--card-bg) p-10 text-center shadow-lg">
          <p className="text-lg font-bold">{t.empty}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{t.emptyHint}</p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-5 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-[var(--on-accent)]"
            >
              {t.clearFilters}
            </button>
          )}
        </div>
      )}

      {!loading && !error && data && data.postings.length > 0 && (
        <>
          <ul className="mt-5 flex flex-col gap-3">
            {data.postings.map((posting, index) => (
              <PostingRow
                key={posting.id}
                posting={posting}
                index={index}
                t={t}
                dateFormat={dateFormat}
                showMatch={matchOnly}
              />
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <p className="text-sm text-[var(--text-muted)]">
              {t.showing(from, to, numberFormat.format(total))}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <PageButton onClick={() => setPage(page - 1)} disabled={page <= 1}>
                {t.previous}
              </PageButton>
              <span className="px-2 text-sm font-semibold">{page} / {lastPage}</span>
              <PageButton onClick={() => setPage(page + 1)} disabled={page >= lastPage}>
                {t.next}
              </PageButton>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className="rounded-xl border border-[var(--accent)]/20 bg-transparent px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] outline-none"
    >
      {label && <option value="">{label}</option>}
      {children}
    </select>
  );
}

function PageButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border border-[var(--accent)]/20 px-4 py-2 text-sm font-semibold disabled:opacity-40"
    >
      {children}
    </button>
  );
}

type PostingsText = ReturnType<typeof getTranslations>["postings"];

function PostingRow({
  posting,
  index,
  t,
  dateFormat,
  showMatch,
}: {
  posting: Posting;
  index: number;
  t: PostingsText;
  dateFormat: Intl.DateTimeFormat;
  showMatch: boolean;
}) {
  const meta = [
    posting.city === "Türkiye" ? t.nationwide : posting.city,
    posting.work_model ? t.models[posting.work_model as keyof typeof t.models] : null,
    posting.work_type ? t.types[posting.work_type as keyof typeof t.types] : null,
    posting.position_level ? t.levels[posting.position_level as keyof typeof t.levels] : null,
    posting.date_posted ? t.posted(dateFormat.format(new Date(posting.date_posted))) : null,
    closingLabel(posting, t, dateFormat),
  ].filter(Boolean);

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.03 }}
      className="flex flex-col gap-4 rounded-[16px] bg-(--card-bg) px-6 py-4 shadow-lg md:flex-row md:items-center md:gap-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-lg bg-[var(--accent-2)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--accent-2)] dark:bg-[var(--creamy)]/15 dark:text-[var(--creamy)]">
            {posting.role === UNCLASSIFIED ? t.otherRole : posting.role}
          </span>
          <h2 className="min-w-0 truncate text-[17px] font-bold">{posting.title}</h2>
          {showMatch && posting.matched_skills !== undefined && (
            <span className="rounded-lg bg-[var(--accent)] px-2.5 py-1 text-[11px] font-bold text-[var(--on-accent)]">
              {t.youHave(posting.matched_skills, posting.skills.length)}
            </span>
          )}
        </div>
        <p className="mt-1.5 truncate text-[13px] text-[var(--text-muted)]">{posting.company}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Icon icon="mdi:map-marker-outline" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{meta.join(" · ")}</span>
        </p>
      </div>

      {posting.skills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 md:w-[268px] md:shrink-0">
          {posting.skills.map((skill) => (
            <li
              key={skill}
              className="rounded-md border border-[var(--accent)]/15 px-2 py-1 text-[11px] font-semibold text-[var(--accent)] dark:border-[var(--creamy)]/35 dark:text-[var(--creamy)]"
            >
              {skill}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3 md:w-[168px] md:shrink-0 md:flex-col md:items-end md:gap-2">
        <span className="text-[11px] text-[var(--text-muted)]">{posting.source}</span>
        <a
          href={posting.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-[10px] bg-[var(--accent-bg)] px-3.5 py-2 text-xs font-bold text-[var(--accent-text)] transition hover:scale-[1.02]"
        >
          {t.viewPosting}
          <Icon icon="mdi:open-in-new" className="h-3.5 w-3.5" />
        </a>
      </div>
    </motion.li>
  );
}

function closingLabel(posting: Posting, t: PostingsText, dateFormat: Intl.DateTimeFormat) {
  if (posting.days_open === null || !posting.closing_date) return t.noClosingDate;
  if (posting.days_open <= 0) return t.closingToday;
  if (posting.days_open <= 7) return t.closingSoon(posting.days_open);
  return t.closes(dateFormat.format(new Date(posting.closing_date)));
}
