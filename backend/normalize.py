from models import NormalizedSkill

# TEMPORARY MOCK FOR TESTING AND DEVELOPMENT
def normalize_skill(candidate: str) -> NormalizedSkill | None:
    """
        With this function, we input the skills (or candidates of skills), and the function checks
        if the candidate is an actual skill located in ESCO. If it is, it creates a NormalizedSkill
        object with its name and its ESCO category. If not, it outputs None. The check is
        case-insensitive, as we lower all the characters of the string before the check.
    """
    esco_skills = {
        "python": "programming languages",
        "java": "programming languages",
        "c": "programming languages",
        "sql": "database management",
        "ruby": "programming languages",
        "c++": "programming languages",
        "html": "programming languages",
        "css": "front-end design",
        "claude": "generative ai",
        "cursor": "generative ai"
    }

    candidate = candidate.lower().strip()
    if candidate in esco_roles:
        return NormalizedSkill(skill = candidate, esco_category = esco_roles[candidate])
    else:
        return None
    
if __name__ == "__main__":
    from handlecv import compute_gaps
    cv_skills = ["python", "c#", "lua", "claude"]
    normalized_skills = []
    for skill in cv_skills:
        result = normalize_skill(skill)
        if result is not None:
            normalized_skills.append(result)
    
    print(normalized_skills)
    print("------------------------")
    python_normalized = normalize_skill("Python")
    java_normalized = normalize_skill("Java")
    c_normalized = normalize_skill("C")
    sql_normalized = normalize_skill("SQL")
    target_roles = ["Data Scientist", "Software Engineer"]
    candidates = [java_normalized, c_normalized, sql_normalized, python_normalized]
    profile = {"Data Scientist": candidates}

    print(compute_gaps(cv_skills = normalized_skills, target_roles = target_roles, demand_profile = profile))