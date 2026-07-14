from models import NormalizedSkill, GapResult, Gap

def compute_gaps(cv_skills: list[NormalizedSkill], target_roles: list[str], demand_profile: dict[str, list[NormalizedSkill]]) -> GapResult:
    gaps_list = []
    checked_roles = []
    for role in target_roles:
        if role not in demand_profile:
            continue

        checked_roles.append(role)
        
        profile = demand_profile[role]
        
        for demanded in profile:
            if not any(cv_skill.skill == demanded.skill for cv_skill in cv_skills):
                gap = Gap(skill = demanded.skill, esco_category = demanded.esco_category)
                for cv_skill in cv_skills:
                    if cv_skill.esco_category == demanded.esco_category:
                        gap.closest_cv_skill = cv_skill.skill
                        break
                gaps_list.append(gap)
    return GapResult(target_roles=checked_roles, gaps = gaps_list)

if __name__ == "__main__":
    python_normalized = NormalizedSkill(skill = "Python", esco_category="programming languages")
    java_normalized = NormalizedSkill(skill = "Java", esco_category="programming languages")
    c_normalized = NormalizedSkill(skill = "C", esco_category="programming languages")
    sql_normalized = NormalizedSkill(skill = "SQL", esco_category="database management")
    target_roles = ["Data Scientist", "Software Engineer"]
    cv = [python_normalized, java_normalized]
    candidates = [java_normalized, c_normalized, sql_normalized]
    profile = {"Data Scientist": candidates}
    print(compute_gaps(cv_skills = cv, target_roles = target_roles, demand_profile = profile))
