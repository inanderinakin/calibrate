import json
import jsonlines as jl
from pathlib import Path
from scraper.roles import map_to_role, DEFAULT_ROLE, GENERIC_ROLE, ROLE_PATTERNS
from models import DemandedSkill
from skills import PATTERNS, SKILL_CATEGORIES
from collections import Counter, defaultdict

demand_profile_path = Path(__file__).parent.parent / "app" / "demand_profile.json"
trends_json_path = Path(__file__).parent.parent / "app" / "trends.json"
postings_path = Path(__file__).parent.parent / "scraper" / "postings.jsonl"
unclassified_role = DEFAULT_ROLE
known_roles = set(ROLE_PATTERNS) | {GENERIC_ROLE, DEFAULT_ROLE}
demand_floor = 0.10
max_skills_per_role = 10

def resolve_role(obj):
    stored = obj.get("role")
    if stored in known_roles:
        return stored
    return map_to_role(obj["title"], obj.get("description_text"))

def build_demand_profile():
    trends = new_trends()
    postings_per_role, term_counts = count_role_terms()

    demand_profile = {}
    for role in postings_per_role:
        total = postings_per_role[role]
        skills = []
        for term in term_counts:
            count = term_counts[term][role]
            if not count:
                continue
            skill_demand = count / total
            if skill_demand < demand_floor:
                continue
            skills.append(DemandedSkill(skill=term, esco_category=SKILL_CATEGORIES[term], demand_percentage=skill_demand, trend=trends.get(term, "Stable")))

        skills.sort(key = lambda skill: skill.demand_percentage, reverse=True)
        demand_profile[role] = skills[:max_skills_per_role]

    json_dict = {}
    for role in demand_profile:
        json_dict[role] = {
            "postings_count": postings_per_role[role],
            "skills": [skill.model_dump() for skill in demand_profile[role]]
        }

    with open(demand_profile_path, "w", encoding="utf-8") as f:
        f.write(json.dumps(json_dict))

    print(f"{len(json_dict)} roles written from {sum(postings_per_role.values())} postings")

def count_role_terms():
    postings_per_role = Counter()
    term_counts = defaultdict(Counter)

    with jl.open(postings_path) as reader:
        for obj in reader:
            role = resolve_role(obj)
            if role == unclassified_role:
                continue

            postings_per_role[role] += 1
            description_text = obj.get('description_text')
            if description_text is None:
                description_text = ""

            for term, pattern in PATTERNS.items():
                if pattern.search(description_text):
                    term_counts[term][role] += 1

    return postings_per_role, term_counts

def new_trends():
    skill_name_to_trend = {}
    with open(trends_json_path) as trends_json_file:
        trends_json = json.load(trends_json_file)
        skills = trends_json['skills']
        for skill in skills:
            skill_name_to_trend[skill['skill']] = skill['trend']  
    return skill_name_to_trend


if __name__ == "__main__":
    build_demand_profile()