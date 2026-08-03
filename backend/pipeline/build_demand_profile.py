import collections
import json
import re
import jsonlines as jl
from pathlib import Path
from normalize import normalize
from scraper.roles import map_to_role, DEFAULT_ROLE, GENERIC_ROLE, ROLE_PATTERNS
from models import DemandedSkill

demand_profile_path = Path(__file__).parent.parent / "app" / "demand_profile.json"
postings_path = Path(__file__).parent.parent / "scraper" / "postings.jsonl"
normalized_postings_path = Path(__file__).parent.parent / "normalized_postings.jsonl"
unclassified_role = DEFAULT_ROLE
baseline_date = "2026-07-29"
known_roles = set(ROLE_PATTERNS) | {GENERIC_ROLE, DEFAULT_ROLE}
baseline_month = "2026-06"
recent_month = "2026-07"
trend_threshold = 0.15
min_skill_count = 10

def fold(text: str) -> str:
    for variant in ("İ", "ı", "I"):
        text = text.replace(variant, "i")
    return text.lower()

BOILERPLATE = {fold(phrase) for phrase in [
    "Show more", "Show less", "show", "more", "less", "vb",
    "Aday Kriterleri", "Eğitim Seviyesi", "Askerlik Durumu", "Yabancı Dil",
    "Aranan Nitelikler", "Genel Nitelikler", "İş Tanımı",
    "Görev ve Sorumluluklar",
    "Key Responsibilities", "Job Description", "Preferred Qualifications",
    "Nice to Have", "What We Offer", "We offer", "About Us", "In this role",
    "sexual orientation", "We may use artificial intelligence",
    "Private health insurance",
]}

ESCO_ARTIFACTS = {
    "computer technology",
    "computer programming",
}

def extract_posting_candidates(description: str) -> list[str]:
    candidates = []
    candidates_raw_1 = re.split(r'[(),/\n]', description)
    for candidate in candidates_raw_1:
        if len(candidate) > 2 and len(candidate) < 39:
            if ":" in candidate or ";" in candidate:
                continue
            else:
                candidates.append(candidate.strip())
    
    candidates_raw_2 = description.split()
    for candidate in candidates_raw_2:
        if ":" in candidate or ";" in candidate:
            continue
        else:
            candidate = candidate.strip(".,!?()\"'")
            candidates.append(candidate)
    candidates = list(dict.fromkeys(candidates))
    return [candidate for candidate in candidates if fold(candidate) not in BOILERPLATE]

def to_iso_date(value):
    value = str(value)
    if "-" in value:
        return value[:10]
    day, month, year = value.split(".")
    return f"{year}-{month}-{day}"

def resolve_role(obj):
    stored = obj.get("role")
    if stored in known_roles:
        return stored
    return map_to_role(obj["title"], obj.get("description_text"))

def build_normalized_postings():
    existing = []
    if normalized_postings_path.exists():
        with jl.open(normalized_postings_path) as reader:
            existing = list(reader)
    done_ids = {obj["id"] for obj in existing if "id" in obj}

    temp_path = normalized_postings_path.with_name(normalized_postings_path.name + ".tmp")
    processed = 0
    with jl.open(temp_path, mode="w") as writer:
        for obj in existing:
            writer.write(obj)

        with jl.open(postings_path) as reader:
            for obj in reader:
                if obj.get("first_seen", baseline_date) <= baseline_date:
                    continue
                if obj["id"] in done_ids:
                    continue

                role = resolve_role(obj)
                if role == unclassified_role:
                    continue

                candidates = extract_posting_candidates(obj["description_text"])
                skills = normalize(candidates)
                writer.write({
                    "id": obj["id"],
                    "role": role,
                    "source": obj["source"],
                    "first_seen": obj["first_seen"],
                    "date_posted": to_iso_date(obj["date_posted"]),
                    "skills": [{"skill": skill.skill, "esco_category": skill.esco_category} for skill in skills],
                })

                processed += 1
                if processed % 100 == 0:
                    print(f"{processed} new postings processed", flush=True)

    temp_path.replace(normalized_postings_path)
    print(f"{processed} new postings added to {len(existing)} existing")

def compute_trends():
    postings_per_cell = collections.Counter()
    skill_counts = collections.defaultdict(collections.Counter)

    with jl.open(normalized_postings_path) as reader:
        for obj in reader:
            month = obj.get("date_posted", "")[:7]
            if month not in (baseline_month, recent_month):
                continue
            cell = (obj["source"], month)
            postings_per_cell[cell] += 1
            for skill in {entry["skill"] for entry in obj["skills"]}:
                if skill in ESCO_ARTIFACTS:
                    continue
                skill_counts[skill][cell] += 1

    sources = {source for source, month in postings_per_cell}
    trends = {}
    for skill in skill_counts:
        directions = set()
        for source in sources:
            old_cell = (source, baseline_month)
            new_cell = (source, recent_month)
            old_count = skill_counts[skill][old_cell]
            new_count = skill_counts[skill][new_cell]
            if old_count < min_skill_count or new_count < min_skill_count:
                continue
            old_share = old_count / postings_per_cell[old_cell]
            new_share = new_count / postings_per_cell[new_cell]
            change = (new_share - old_share) / old_share
            if change > trend_threshold:
                directions.add("Emerging")
            elif change < -trend_threshold:
                directions.add("Fading")
            else:
                directions.add("Stable")

        if len(directions) == 1:
            trends[skill] = directions.pop()

    return trends

def build_demand_profile():
    trends = compute_trends()
    postings_per_role = collections.Counter()
    role_skill_counts = collections.defaultdict(collections.Counter)
    skill_category = {}

    with jl.open(normalized_postings_path) as reader:
        for obj in reader:
            role = obj["role"]
            postings_per_role[role] += 1
            for skill in obj["skills"]:
                if skill["skill"] in ESCO_ARTIFACTS:
                    continue
                if skill["skill"].lower() == role.lower():
                    continue
                role_skill_counts[role][skill["skill"]] += 1
                skill_category[skill["skill"]] = skill["esco_category"]

    demand_profile = {}
    for role in role_skill_counts:
        for skill in role_skill_counts[role]:
            skill_demand = role_skill_counts[role][skill] / postings_per_role[role]
            if skill_demand > 0.2:
                demanded_skill = DemandedSkill(skill=skill, esco_category=skill_category[skill], demand_percentage=skill_demand, trend=trends.get(skill, "Stable"))
                demand_profile.setdefault(role, list()).append(demanded_skill)

    for role in demand_profile:
        demand_profile[role].sort(key = lambda skill: skill.demand_percentage, reverse=True)

    json_dict = {}
    for role in demand_profile:
        json_dict[role] = [skill.model_dump() for skill in demand_profile[role]]

    with open(demand_profile_path, "w", encoding="utf-8") as f:
        f.write(json.dumps(json_dict))

    print(f"{len(json_dict)} roles written from {sum(postings_per_role.values())} postings")

if __name__ == "__main__":
    build_normalized_postings()
    build_demand_profile()