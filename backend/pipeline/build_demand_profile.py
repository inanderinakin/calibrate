import collections
import json
import re
import jsonlines as jl
from pathlib import Path
from normalize import normalize
from scraper.roles import map_to_role, DEFAULT_ROLE
from models import DemandedSkill

demand_profile_path = Path(__file__).parent.parent / "app" / "demand_profile.json"
postings_path = Path(__file__).parent.parent / "scraper" / "postings.jsonl"
normalized_postings_path = Path(__file__).parent.parent / "normalized_postings.jsonl"
unclassified_role = DEFAULT_ROLE

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

def build_normalized_postings():
    temp_path = normalized_postings_path.with_name(normalized_postings_path.name + ".tmp")
    processed = 0
    with jl.open(postings_path) as reader, jl.open(temp_path, mode="w") as writer:
        for obj in reader:
            role = obj.get("role") or map_to_role(obj["title"], obj.get("description_text"))
            if role == unclassified_role:
                continue

            candidates = extract_posting_candidates(obj["description_text"])
            skills = normalize(candidates)
            writer.write({
                "role": role,
                "skills": [{"skill": skill.skill, "esco_category": skill.esco_category} for skill in skills],
            })

            processed += 1
            if processed % 100 == 0:
                print(f"{processed} postings processed", flush=True)

    temp_path.replace(normalized_postings_path)

def build_demand_profile():
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
                demanded_skill = DemandedSkill(skill=skill, esco_category=skill_category[skill], demand_percentage=skill_demand, trend="Stable")
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
    if not normalized_postings_path.exists():
        build_normalized_postings()
    build_demand_profile()