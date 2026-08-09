import collections
import datetime
import json
import math
from pathlib import Path
import jsonlines as jl
from skills import PATTERNS
from scraper.roles import map_to_role, DEFAULT_ROLE, GENERIC_ROLE, ROLE_PATTERNS

trends_path = Path(__file__).parent.parent / "app" / "trends.json"
postings_path = Path(__file__).parent.parent / "scraper" / "postings.jsonl"

baseline_month = "2026-06"
recent_month = "2026-07"
change_threshold = 0.15
directional_floor = 0.075
z_score = 2.0
min_cell_postings = 100
min_term_occurrences = 10
window_days = 28
min_window_postings = 120
first_series_week = "2026-06-01"
min_role_postings = 50
known_roles = set(ROLE_PATTERNS) | {GENERIC_ROLE, DEFAULT_ROLE}

def posted_date(obj):
    value = str(obj["date_posted"])
    if "-" in value:
        return value[:10]
    day, month, year = value.split(".")
    return f"{year}-{month}-{day}"


def posted_month(obj):
    return posted_date(obj)[:7]


def count_terms():
    postings_per_cell = collections.Counter()
    term_counts = collections.defaultdict(collections.Counter)

    with jl.open(postings_path) as reader:
        for obj in reader:
            month = posted_month(obj)
            if month not in (baseline_month, recent_month):
                continue

            cell = (obj["source"], month)
            postings_per_cell[cell] += 1
            description = obj.get("description_text") or ""
            for term, pattern in PATTERNS.items():
                if pattern.search(description):
                    term_counts[term][cell] += 1

    return postings_per_cell, term_counts


def build_series(sources):
    postings_per_day = collections.defaultdict(collections.Counter)
    term_counts = collections.defaultdict(lambda: collections.defaultdict(collections.Counter))
    last_day = None

    with jl.open(postings_path) as reader:
        for obj in reader:
            try:
                day = datetime.date.fromisoformat(posted_date(obj))
            except ValueError:
                continue

            source = obj["source"]
            postings_per_day[day][source] += 1
            if last_day is None or day > last_day:
                last_day = day

            description = obj.get("description_text") or ""
            for term, pattern in PATTERNS.items():
                if pattern.search(description):
                    term_counts[term][day][source] += 1

    if last_day is None:
        return [], {}

    def window_of(anchor):
        end = anchor + datetime.timedelta(days=6)
        return [end - datetime.timedelta(days=offset) for offset in range(window_days)]

    def totals(days, source):
        return sum(postings_per_day[day][source] for day in days)

    first_anchor = datetime.date.fromisoformat(first_series_week)
    last_anchor = last_day - datetime.timedelta(days=last_day.weekday())

    weeks = []
    windows = {}
    anchor = first_anchor
    while anchor <= last_anchor:
        days = window_of(anchor)
        if all(totals(days, source) >= min_window_postings for source in sources):
            weeks.append(anchor.isoformat())
            windows[anchor.isoformat()] = days
        anchor += datetime.timedelta(days=7)

    series = {}
    for term in PATTERNS:
        values = []
        for week in weeks:
            days = windows[week]
            shares = [
                sum(term_counts[term][day][source] for day in days) / totals(days, source)
                for source in sources
            ]
            values.append(round(sum(shares) / len(shares), 4))
        if values:
            series[term] = values

    return weeks, series


def resolve_role(obj):
    stored = obj.get("role")
    if stored in known_roles:
        return stored
    return map_to_role(obj["title"], obj.get("description_text"))


def build_role_series():
    postings_per_day = collections.defaultdict(collections.Counter)
    term_counts = collections.defaultdict(lambda: collections.defaultdict(collections.Counter))
    last_day = None

    with jl.open(postings_path) as reader:
        for obj in reader:
            try:
                day = datetime.date.fromisoformat(posted_date(obj))
            except ValueError:
                continue

            role = resolve_role(obj)
            if role == DEFAULT_ROLE:
                continue

            postings_per_day[role][day] += 1
            if last_day is None or day > last_day:
                last_day = day

            description = obj.get("description_text") or ""
            for term, pattern in PATTERNS.items():
                if pattern.search(description):
                    term_counts[role][term][day] += 1

    if last_day is None:
        return {}

    first_anchor = datetime.date.fromisoformat(first_series_week)
    last_anchor = last_day - datetime.timedelta(days=last_day.weekday())

    anchors = []
    anchor = first_anchor
    while anchor <= last_anchor:
        anchors.append(anchor)
        anchor += datetime.timedelta(days=7)

    roles = {}
    for role in postings_per_day:
        weeks = []
        totals = []
        for anchor in anchors:
            end = anchor + datetime.timedelta(days=6)
            total = sum(
                count for day, count in postings_per_day[role].items() if day <= end
            )
            if total < min_role_postings:
                continue
            weeks.append(anchor.isoformat())
            totals.append((end, total))

        if not weeks:
            continue

        series = {}
        for term in PATTERNS:
            counted = term_counts[role].get(term)
            if not counted:
                continue
            values = [
                round(sum(k for day, k in counted.items() if day <= end) / total, 4)
                for end, total in totals
            ]
            series[term] = values

        roles[role] = {"weeks": weeks, "series": series}

    return roles


def measure(old_count, old_total, new_count, new_total):
    old_share = old_count / old_total
    new_share = new_count / new_total
    standard_error = math.sqrt(
        old_share * (1 - old_share) / old_total + new_share * (1 - new_share) / new_total
    )
    change = (new_share - old_share) / old_share
    z = (new_share - old_share) / standard_error if standard_error else 0.0

    if abs(z) >= z_score and abs(change) >= change_threshold:
        label = "Emerging" if change > 0 else "Fading"
    else:
        label = "Stable"

    return {
        "baseline_count": old_count,
        "baseline_total": old_total,
        "baseline_share": round(old_share, 4),
        "recent_count": new_count,
        "recent_total": new_total,
        "recent_share": round(new_share, 4),
        "change": round(change, 4),
        "z": round(z, 2),
        "label": label,
    }


def build_trends():
    postings_per_cell, term_counts = count_terms()
    sources = sorted({
        source for (source, month), total in postings_per_cell.items()
        if total >= min_cell_postings
    })
    usable = [
        source for source in sources
        if postings_per_cell[(source, baseline_month)] >= min_cell_postings
        and postings_per_cell[(source, recent_month)] >= min_cell_postings
    ]

    results = []
    for term in PATTERNS:
        per_source = {}
        for source in usable:
            old_total = postings_per_cell[(source, baseline_month)]
            new_total = postings_per_cell[(source, recent_month)]
            old_count = term_counts[term][(source, baseline_month)]
            new_count = term_counts[term][(source, recent_month)]
            if old_count < min_term_occurrences or new_count < min_term_occurrences:
                continue
            per_source[source] = measure(old_count, old_total, new_count, new_total)

        if len(per_source) < 2:
            continue

        changes = [entry["change"] for entry in per_source.values()]
        labels = {entry["label"] for entry in per_source.values()}
        mean_change = sum(changes) / len(changes)

        if len(labels) == 1 and labels != {"Stable"}:
            trend, confidence = labels.pop(), "confirmed"
        elif (
            all(change > 0 for change in changes) or all(change < 0 for change in changes)
        ) and abs(mean_change) >= change_threshold and min(abs(change) for change in changes) >= directional_floor:
            trend, confidence = ("Emerging" if mean_change > 0 else "Fading"), "directional"
        else:
            continue

        recent_count = sum(entry["recent_count"] for entry in per_source.values())
        recent_total = sum(entry["recent_total"] for entry in per_source.values())
        results.append({
            "skill": term,
            "trend": trend,
            "confidence": confidence,
            "demand_percentage": round(recent_count / recent_total, 4),
            "change": round(mean_change, 4),
            "sources": per_source,
        })

    results.sort(key=lambda entry: entry["change"], reverse=True)

    weeks, series = build_series(usable)
    roles = build_role_series()

    output = {
        "baseline_month": baseline_month,
        "recent_month": recent_month,
        "sources": usable,
        "skills": results,
        "weeks": weeks,
        "series": series,
        "roles": roles,
    }

    with open(trends_path, "w", encoding="utf-8") as f:
        f.write(json.dumps(output, ensure_ascii=False))

    counts = collections.Counter((entry["confidence"], entry["trend"]) for entry in results)
    print(f"{len(results)} terms reported from {len(usable)} sources: {dict(counts)}")
    print(f"{len(series)} terms charted across {len(weeks)} weeks")
    print(f"{len(roles)} roles charted: " + ", ".join(f"{r} ({len(v['weeks'])}w)" for r, v in sorted(roles.items())))


if __name__ == "__main__":
    build_trends()
