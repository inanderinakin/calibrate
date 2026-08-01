from models import DemandedSkill, MatchData, NormalizedSkill, GapResult, Gap

def compute_gaps(cv_skills: list[NormalizedSkill], target_roles: list[str], demand_profile: dict[str, list[DemandedSkill]]) -> GapResult:
    gaps_list = {}
    checked_roles = []
    matched_list = {}
    for role in target_roles:
        if role not in demand_profile:
            continue

        checked_roles.append(role)
        gaps_list[role] = []
        profile = demand_profile[role]

        total_demanded = len(profile)
        
        for demanded in profile:
            if not any(cv_skill.skill == demanded.skill for cv_skill in cv_skills):
                gap = Gap(
                    skill = demanded.skill,
                    esco_category = demanded.esco_category,
                    demand_percentage= demanded.demand_percentage,
                    trend="Stable")
                for cv_skill in cv_skills:
                    if cv_skill.esco_category == demanded.esco_category:
                        gap.closest_cv_skill = cv_skill.skill
                        break
                gaps_list[role].append(gap)

        matched_demanded = total_demanded - len(gaps_list[role])
        matched_list[role] = MatchData(matched_demanded=matched_demanded, total_demanded=total_demanded, ratio= matched_demanded / total_demanded if total_demanded else 0.0)
    return GapResult(target_roles=checked_roles, gaps = gaps_list, matched_data = matched_list)

if __name__ == "__main__":
    python_normalized = DemandedSkill(skill = "Python", esco_category="programming languages", demand_percentage=0.2, trend="Stable")
    java_normalized = DemandedSkill(skill = "Java", esco_category="programming languages", demand_percentage=0.2, trend="Stable")
    c_normalized = DemandedSkill(skill = "C", esco_category="programming languages", demand_percentage=0.2, trend="Stable")
    sql_normalized = DemandedSkill(skill = "SQL", esco_category="database management", demand_percentage=0.2, trend="Stable")
    
    target_roles = ["Data Scientist", "Software Engineer"]
    cv = [python_normalized, java_normalized]

    profile = {
        "Data Scientist": [java_normalized, c_normalized, sql_normalized],
        "Software Engineer": [java_normalized],
    }

    result = compute_gaps(cv_skills = cv, target_roles = target_roles, demand_profile = profile)
    print(result.model_dump_json(indent=2))
