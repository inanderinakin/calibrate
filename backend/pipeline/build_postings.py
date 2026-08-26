"""
Build the list of job postings the app is allowed to show.

Two filters decide what survives:

  active     still open, or undated but posted inside the last 45 days.
             is_active on the raw posting is useless here — it is written once
             at scrape time and never refreshed, so it is True on all 3,056.

  reachable  check_links.py got a real answer from the board and it was "yes".
             Never-checked postings do not qualify. An unverified link is not
             a live link.

Skills come from the keyword patterns, the same ones build_demand_profile.py
uses, not from the ESCO normaliser. ESCO names read badly on a job card
("computer technology", "digital camera sensors") and only cover part of the
corpus.

A card has room for six of them, and which six is not arbitrary: they are ranked
by how much the posting's own role demands each skill, so a QA posting leads with
its testing tools rather than with whatever language happens to sit earliest in
PATTERNS. Before this, the cut was dict order -- a Senior QA Automation posting
kept Java, PHP, React and Spring, which it named once while describing the system
under test, and dropped CI/CD, which it actually asked for.
"""
import json
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path

import jsonlines as jl

from scraper.roles import resolve_role, DEFAULT_ROLE
from skills import PATTERNS
from pipeline.cities import nationwide, normalize_city, provinces

postings_path = Path(__file__).parent.parent / "scraper" / "postings.jsonl"
link_status_path = Path(__file__).parent.parent / "app" / "link_status.json"
output_path = Path(__file__).parent.parent / "app" / "active_postings.json"
demand_profile_path = Path(__file__).parent.parent / "app" / "demand_profile.json"

undated_window_days = 45
max_skills = 6

work_models = {
    "iş yerinde": "onsite",
    "hibrit": "hybrid",
    "uzaktan / remote": "remote",
    "home office": "remote",
}

work_types = {
    "tam zamanlı": "fulltime",
    "full-time": "fulltime",
    "yarı zamanlı / part time": "parttime",
    "yarı zamanlı / part-time": "parttime",
    "part-time": "parttime",
    "part time": "parttime",
    "contract": "contract",
    "dönemsel / proje bazlı": "contract",
    "dönemsel": "contract",
    "periodical": "contract",
    "serbest": "freelance",
    "internship": "internship",
    "stajyer": "internship",
    "temporary": "temporary",
}

position_levels = {
    "uzman": "specialist",
    "specialist": "specialist",
    "mid-senior level": "midsenior",
    "associate": "associate",
    "entry level": "entry",
    "yeni başlayan": "entry",
    "new starter": "entry",
    "uzman yardımcısı": "assistant",
    "assistant specialist": "assistant",
    "eleman": "staff",
    "orta düzey yönetici": "midmanager",
    "medium level manager": "midmanager",
    "üst düzey yönetici": "seniormanager",
    "yönetici adayı": "managercandidate",
    "manager candidate": "managercandidate",
    "stajyer": "intern",
    "internship": "intern",
}


def parse_date(value):
    if not value:
        return None
    for pattern in ("%d.%m.%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(str(value), pattern).date()
        except ValueError:
            continue
    return None


def is_active(posting, today):
    closing = parse_date(posting.get("closing_date"))
    if closing:
        return closing >= today

    posted = parse_date(posting.get("date_posted"))
    return bool(posted and (today - posted).days <= undated_window_days)


def canonical(value, table):
    """Boards write the same thing in two languages and several spellings."""
    if not value:
        return None
    text = str(value).strip().lower()
    if text in table:
        return table[text]
    # 'Tam Zamanlı, Hibrit' and friends pack two facts into one field.
    for part in text.replace(";", ",").split(","):
        part = part.strip()
        if part in table:
            return table[part]
    return None


def load_role_demand():
    """skill -> demand share, per role, from the profile built alongside this file."""
    try:
        with open(demand_profile_path, encoding="utf-8") as handle:
            profile = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return {}

    table = {}
    for role, entry in profile.items():
        skills = entry.get("skills", []) if isinstance(entry, dict) else entry
        table[role] = {item["skill"]: float(item["demand_percentage"]) for item in skills}
    return table


role_demand = load_role_demand()


def extract_skills(posting, role):
    text = f"{posting.get('title', '')} {posting.get('description_text') or ''}"
    found = [skill for skill, pattern in PATTERNS.items() if pattern.search(text)]

    # Rank by what this role actually asks for. Anything the profile does not
    # mention scores 0 and keeps its relative order behind those that do.
    demand = role_demand.get(role, {})
    found.sort(key=lambda skill: demand.get(skill, 0.0), reverse=True)
    return found[:max_skills]


def slim(posting, today):
    posted = parse_date(posting.get("date_posted"))
    closing = parse_date(posting.get("closing_date"))
    work_model = canonical(posting.get("work_model"), work_models) or canonical(posting.get("work_type"), work_models)
    role = resolve_role(posting["title"], posting.get("description_text"), posting.get("role"))

    return {
        "id": posting["id"],
        "title": posting["title"],
        "company": posting["company"],
        "city": normalize_city(posting.get("city")),
        "role": role,
        "source": posting["source"],
        "url": posting["url"],
        "work_model": work_model,
        "work_type": canonical(posting.get("work_type"), work_types),
        "position_level": canonical(posting.get("position_level"), position_levels),
        "date_posted": posted.isoformat() if posted else None,
        "closing_date": closing.isoformat() if closing else None,
        "days_open": (closing - today).days if closing else None,
        "skills": extract_skills(posting, role),
    }


def build_postings():
    today = date.today()

    with open(link_status_path, encoding="utf-8") as status_file:
        link_status = json.load(status_file).get("postings", {})

    with jl.open(postings_path) as reader:
        raw = list(reader)

    active = [posting for posting in raw if is_active(posting, today)]
    reachable = [posting for posting in active if link_status.get(posting["id"], {}).get("alive")]

    postings = [slim(posting, today) for posting in reachable]

    # An unclassified role is a gap in the role patterns, not proof the job is
    # off-topic: "Data Architect", "Lead Golang Engineer" and "Bilgi
    # Teknolojileri Uzmanı" all land here. Dropping them hid 207 real LinkedIn
    # jobs. Keep the ones we could read tech skills out of, and let the rest go
    # — a posting with no role and no recognisable skill is a school looking
    # for an English teacher.
    postings = [
        posting for posting in postings
        if posting["role"] != DEFAULT_ROLE or posting["skills"]
    ]
    postings.sort(key=lambda posting: posting["date_posted"] or "", reverse=True)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "counts": {
            "stored": len(raw),
            "active": len(active),
            "reachable": len(reachable),
            "shown": len(postings),
            "unverified": len([p for p in active if p["id"] not in link_status]),
        },
        # "Unclassified" sorts last so the filter reads as real roles first,
        # then a catch-all the frontend labels "Other".
        "roles": sorted(
            {posting["role"] for posting in postings},
            key=lambda role: (role == DEFAULT_ROLE, role),
        ),
        # Ordered by how many postings ask for them, so the filter opens on the
        # skills that actually move the list rather than alphabetical trivia.
        "skills": [
            skill for skill, _ in Counter(
                skill for posting in postings for skill in posting["skills"]
            ).most_common()
        ],
        # Only real places get a filter entry. A handful of postings carry
        # scraper noise in the city field ('Eğitim', 'Destek'); it still shows
        # on their own row, but it is not somewhere you can filter by.
        "cities": sorted({
            posting["city"] for posting in postings
            if posting["city"] in set(provinces) | {nationwide}
        }),
        "sources": sorted({posting["source"] for posting in postings}),
        "postings": postings,
    }

    with open(output_path, "w", encoding="utf-8") as output_file:
        json.dump(payload, output_file, ensure_ascii=False, indent=1)

    print(f"stored {len(raw)} -> active {len(active)} -> reachable {len(reachable)} -> shown {len(postings)}")
    return payload


if __name__ == "__main__":
    build_postings()
