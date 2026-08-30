import json
import sys
from pathlib import Path

app_dir = Path(__file__).parent.parent / "app"
sys.path.insert(0, str(app_dir))

from skills import PATTERNS

def load_json_artifact(filename):
    path = app_dir / filename
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def skills_of(role_data):
    """The profile stores either a plain list of skills or {skills, postings_count}."""
    if isinstance(role_data, list):
        return role_data
    return role_data.get("skills", [])

def test_every_profile_skill_exists_in_keyword_list():
    """Check that every skill demanded in a profile exists in the keyword patterns."""
    demand_profile = load_json_artifact("demand_profile.json")
    
    missing_skills = []
    for role, role_data in demand_profile.items():
        for skill_entry in skills_of(role_data):
            skill_name = skill_entry["skill"]
            if skill_name not in PATTERNS:
                missing_skills.append(f"{skill_name} (in {role})")
                
    assert not missing_skills, f"Found demanded skills missing from PATTERNS: {', '.join(missing_skills)}"

def test_every_profile_skill_has_a_resource():
    """Check that every demanded skill has an entry in resources.json."""
    demand_profile = load_json_artifact("demand_profile.json")
    resources = load_json_artifact("resources.json")
    
    unique_demanded_skills = set()
    for role_data in demand_profile.values():
        for skill_entry in skills_of(role_data):
            unique_demanded_skills.add(skill_entry["skill"])
            
    missing_resources = [skill for skill in unique_demanded_skills if skill not in resources]
    
    assert not missing_resources, f"Found demanded skills missing from resources.json: {', '.join(missing_resources)}"

def test_trends_are_not_100_percent_stable():
    """Check that not every trend in trends.json is marked as 'Stable'."""
    trends = load_json_artifact("trends.json")
    
    all_trends = [skill_data.get("trend", "Stable") for skill_data in trends.get("skills", [])]
    
    assert len(all_trends) > 0, "No skills found in trends.json"
    
    has_unstable_trend = any(trend != "Stable" for trend in all_trends)
    
    assert has_unstable_trend, "All trends are marked as 100% Stable, which indicates a pipeline regression."

def test_every_shown_posting_has_a_link_we_checked_and_reached():
    """The page promises live links. A posting nobody verified must not be on it."""
    postings = load_json_artifact("active_postings.json")
    link_status = load_json_artifact("link_status.json")["postings"]

    unreachable = [
        posting["id"] for posting in postings["postings"]
        if not link_status.get(posting["id"], {}).get("alive")
    ]

    assert not unreachable, f"{len(unreachable)} postings are listed without a verified live link: {unreachable[:5]}"

def test_no_shown_posting_is_past_its_closing_date():
    """A posting that closed yesterday is not an opening.

    Asserted against the filter the endpoint runs, not against the artifact. The
    artifact is only filtered when it is built and is then served for days, so
    checking it directly just measured how old the file was.
    """
    from postings_rules import drop_expired

    postings = load_json_artifact("active_postings.json")["postings"]
    today = "2026-08-21"

    shown = drop_expired(postings, today)
    expired = [p["id"] for p in shown if p["closing_date"] and p["closing_date"] < today]

    assert not expired, f"{len(expired)} closed postings survived the filter: {expired[:5]}"

    rows = [
        {"id": "no-date", "closing_date": None},
        {"id": "future", "closing_date": "2099-01-01"},
        {"id": "today", "closing_date": today},
        {"id": "yesterday", "closing_date": "2026-08-20"},
    ]
    assert [p["id"] for p in drop_expired(rows, today)] == ["no-date", "future", "today"]

def test_posting_facets_use_known_tokens():
    """The frontend translates these by token, so an unmapped one renders blank."""
    postings = load_json_artifact("active_postings.json")

    allowed = {
        "work_model": {"onsite", "hybrid", "remote"},
        "work_type": {"fulltime", "parttime", "contract", "freelance", "internship", "temporary"},
        "position_level": {
            "entry", "associate", "specialist", "assistant", "midsenior", "staff",
            "midmanager", "seniormanager", "managercandidate", "intern",
        },
    }

    unknown = []
    for posting in postings["postings"]:
        for field, tokens in allowed.items():
            value = posting[field]
            if value and value not in tokens:
                unknown.append(f"{field}={value}")

    assert not unknown, f"Postings carry tokens the frontend cannot translate: {sorted(set(unknown))}"

def test_postings_artifact_is_not_empty():
    """An empty board means the pipeline dropped everything — fail rather than ship it."""
    postings = load_json_artifact("active_postings.json")

    assert len(postings["postings"]) > 0, "active_postings.json has no postings at all"
