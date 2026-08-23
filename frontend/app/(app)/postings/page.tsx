"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import { Skeleton } from "@/components/Skeleton";
import { getPostings } from "@/lib/api";
import { session } from "@/lib/session";
import { useRestoreAnalysis } from "@/lib/useRestoreAnalysis";
import { useDelayedLoading } from "@/lib/useDelayedLoading";
import type { Posting, PostingsPayload } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/translations";
import { duration } from "@/lib/motion";

const PAGE_SIZE = 20;
const MODELS = ["onsite", "hybrid", "remote"] as const;

function addFilter(
  set: React.Dispatch<React.SetStateAction<string[]>>,
  value: string
) {
  if (!value) return;
  set((prev) => (prev.includes(value) ? prev : [...prev, value]));
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-(--border-color)/40 bg-(--border-color)/20 py-0.5 pl-2.5 pr-1 text-xs font-semibold text-[var(--text-primary)]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={label}
        className="flex h-4 w-4 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
      >
        <Icon icon="mdi:close" className="h-3 w-3" />
      </button>
    </span>
  );
}

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
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [workModel, setWorkModel] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);

  const [mySkills, setMySkills] = useState<string[]>([]);
  const [matchOnly, setMatchOnly] = useState(false);
  const restored = useRestoreAnalysis();
  // The buttons still key off raw `loading`; only what the eye sees is delayed.
  const showLoading = useDelayedLoading(loading);

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
  }, [debouncedSearch, selectedRoles, city, workModel, selectedSkills, sort, matchOnly]);

  // mySkills only reaches the request when the match filter is on, but it lands after
  // the analysis restore and is a brand new array every time, which put a fresh
  // identity into load's deps and refetched the list out from under the user. Keying
  // off a string keeps that churn out of load.
  const matchKey = matchOnly && mySkills.length ? mySkills.join("\u0000") : "";
  const matchSkills = useMemo(
    () => (matchKey ? matchKey.split("\u0000") : undefined),
    [matchKey]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await getPostings({
        role: selectedRoles.length ? selectedRoles : undefined,
        city: city || undefined,
        workModel: workModel || undefined,
        skill: selectedSkills.length ? selectedSkills : undefined,
        mySkills: matchSkills,
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
  }, [selectedRoles, city, workModel, selectedSkills, matchSkills, debouncedSearch, sort, page, t.error]);

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

  const hasFilters = Boolean(
    selectedRoles.length || city || workModel || selectedSkills.length || search || matchOnly
  );

  // The page used to appear to teleport to the top on Next. Nothing scrolled it: the
  // list was swapped for six skeletons, the document got shorter than the current
  // scroll offset, and the browser clamped it. Keeping the old list on screen while
  // the next one loads holds the height, which is what lets this animate at all.
  function goToPage(next: number) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    setPage(next);
  }

  function clearFilters() {
    setSearch("");
    setSelectedRoles([]);
    setCity("");
    setWorkModel("");
    setSelectedSkills([]);
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
        <div className="flex min-w-[240px] max-w-[380px] flex-1 items-center gap-2 rounded-xl bg-[var(--hover-bg)] px-3 py-2.5">
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

        <Select value="" onChange={(value) => addFilter(setSelectedRoles, value)} label={t.allRoles}>
          {(data?.roles ?? []).filter((option) => !selectedRoles.includes(option)).map((option) => (
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

        <Select value="" onChange={(value) => addFilter(setSelectedSkills, value)} label={t.allSkills}>
          {(data?.skills ?? []).filter((option) => !selectedSkills.includes(option)).map((option) => (
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

      {(selectedRoles.length > 0 || selectedSkills.length > 0) && (
        <div className="mt-4 flex flex-col gap-2">
          {selectedRoles.length > 0 && (
            <FilterGroup label={t.filterRoles}>
              {selectedRoles.map((option) => (
                <FilterChip
                  key={option}
                  label={option === UNCLASSIFIED ? t.otherRole : option}
                  onRemove={() => setSelectedRoles((prev) => prev.filter((name) => name !== option))}
                />
              ))}
            </FilterGroup>
          )}

          {selectedSkills.length > 0 && (
            <FilterGroup label={t.filterSkills}>
              {selectedSkills.map((option) => (
                <FilterChip
                  key={option}
                  label={option}
                  onRemove={() => setSelectedSkills((prev) => prev.filter((name) => name !== option))}
                />
              ))}
            </FilterGroup>
          )}
        </div>
      )}

      {/* Waits for the restore: mySkills is empty for a moment on load, and
          without this a signed-in user with a CV sees the prompt flash first. The
          placeholder holds the slot at the height of the taller of the two, so the
          list below does not get shoved down when the restore lands. */}
      {!restored && (
        <div className="mt-4 flex h-[76px] w-full items-center gap-4 rounded-[18px] bg-(--card-bg) px-6 shadow-lg">
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-32 max-w-full" />
          </div>
        </div>
      )}

      {restored && mySkills.length === 0 && (
        <Link
          href="/upload_cv"
          className="mt-4 flex w-full items-center gap-4 rounded-[18px] bg-(--card-bg) px-6 py-4 text-left text-[var(--text-primary)] shadow-lg"
        >
          <Icon icon="mdi:account-star-outline" className="h-8 w-8 shrink-0" />
          <span className="min-w-0 flex-1 text-base font-black">{t.matchNoCv}</span>
          <Icon icon="mdi:arrow-right" className="h-5 w-5 shrink-0" />
        </Link>
      )}

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

      {showLoading && !error && (!data || data.postings.length === 0) && (
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

      {!error && data && data.postings.length > 0 && (
        <>
          <ul
            aria-busy={loading}
            className={`mt-5 flex flex-col gap-3 transition-opacity duration-200 ${
              showLoading ? "opacity-50" : ""
            }`}
          >
            {(() => {
              const rows = data.postings.map((posting, index) => (
                <PostingRow
                  key={posting.id}
                  posting={posting}
                  index={index}
                  t={t}
                  dateFormat={dateFormat}
                  showMatch={matchOnly}
                />
              ));

              if (!matchOnly) return rows;

              // The backend sorts by how much is missing, so the split is just the
              // first posting that still needs something.
              const firstGap = data.postings.findIndex(
                (posting) => (posting.missing_skills?.length ?? 0) > 0
              );

              if (firstGap === -1) return rows;

              return [
                ...(firstGap > 0
                  ? [<GroupLabel key="ready" text={t.readyGroup} />, ...rows.slice(0, firstGap)]
                  : []),
                <GroupLabel key="nearly" text={t.nearlyGroup} />,
                ...rows.slice(firstGap),
              ];
            })()}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <p className="text-sm text-[var(--text-muted)]">
              {t.showing(from, to, numberFormat.format(total))}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <PageButton onClick={() => goToPage(page - 1)} disabled={page <= 1 || loading}>
                {t.previous}
              </PageButton>
              <span className="px-2 text-sm font-semibold">{page} / {lastPage}</span>
              <PageButton onClick={() => goToPage(page + 1)} disabled={page >= lastPage || loading}>
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
      className="max-w-[170px] truncate rounded-xl border border-[var(--accent)]/20 bg-transparent px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] outline-none"
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

function joinList(items: string[], and: string) {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`;
}

function GroupLabel({ text }: { text: string }) {
  return (
    <li className="mt-2 flex items-center gap-3 first:mt-0">
      <span className="text-sm font-black uppercase tracking-wide text-(--text-muted)">
        {text}
      </span>
      <span className="h-px flex-1 bg-(--border-color)/30" />
    </li>
  );
}

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
      transition={{ duration: duration.fast, delay: Math.min(index, 8) * duration.stagger }}
      className="flex flex-col gap-4 rounded-[16px] bg-(--card-bg) px-6 py-4 shadow-lg md:flex-row md:items-center md:gap-5"
    >
      <div className="min-w-0 flex-1">
        {/* The badges keep their own line so every card breaks in the same place.
            Sharing a row with the title made it depend on how long the title was. */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-lg bg-[var(--accent-2)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--accent-2)] dark:bg-[var(--creamy)]/15 dark:text-[var(--creamy)]">
            {posting.role === UNCLASSIFIED ? t.otherRole : posting.role}
          </span>
          {showMatch && posting.missing_skills && posting.missing_skills.length > 0 && (
            <p className="mt-1 text-sm font-semibold text-(--accent-2)">
              {t.learnLine(joinList(posting.missing_skills, t.listAnd))}
            </p>
          )}

          {showMatch && posting.matched_skills !== undefined && posting.skills.length > 1 && (
            <span className="rounded-lg bg-[var(--accent)] px-2.5 py-1 text-[11px] font-bold text-[var(--on-accent)]">
              {t.youHave(posting.matched_skills, posting.skills.length)}
            </span>
          )}
        </div>
        <h2 className="mt-1.5 text-[17px] font-bold">{posting.title}</h2>
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
