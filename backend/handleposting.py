import collections
import json
import re
import jsonlines as jl
from pathlib import Path
from normalize import normalize_skills, normalize_posting
from scraper.roles import map_to_role
from models import DemandedSkill

demand_profile_path = Path(__file__).parent / "demand_profile.json"

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
    return candidates

def load_demand_profile():
    with open(demand_profile_path) as json_file:
        json_data = json.load(json_file)

        profile = {}

        for role in json_data:
            profile[role] = list()
            for skill in json_data[role]:
                profile[role].append(DemandedSkill(**skill))

    return profile
       

if __name__ == "__main__":
    with jl.open((Path(__file__).parent / "scraper" / "postings.jsonl")) as reader:
        postings_per_role = collections.Counter()
        role_skill_counts = collections.defaultdict(collections.Counter)
        skill_category = {}

        for obj in reader: 
            role = obj.get("role") or map_to_role(obj["title"], obj.get("description_text"))
            postings_per_role[role] += 1

            candidates = extract_posting_candidates(obj["description_text"])
            skills = normalize_posting(candidates)
            for skill in skills:
                role_skill_counts[role][skill.skill] += 1
                skill_category[skill.skill] = skill.esco_category

        demand_profile = {}
        for role in role_skill_counts:
            for skill in role_skill_counts[role]:
                skill_demand = role_skill_counts[role][skill] / postings_per_role[role]
                if skill_demand > 0.2:
                    demanded_skill = DemandedSkill(skill=skill, esco_category=skill_category[skill], demand_percentage=skill_demand)
                    demand_profile.setdefault(role, list()).append(demanded_skill)

        for role in demand_profile:
            demand_profile[role].sort(key = lambda skill: skill.demand_percentage, reverse=True)

        json_dict = {}
        for role in demand_profile:
            json_dict[role] = [skill.model_dump() for skill in demand_profile[role]]

        with open(demand_profile_path, "w", encoding="utf-8") as f:
                f.write(json.dumps(json_dict))