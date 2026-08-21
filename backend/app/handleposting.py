import json
from collections import Counter, defaultdict
from pathlib import Path
from dotenv import load_dotenv
from fastapi.concurrency import run_in_threadpool
from models import DemandedSkill
import boto3

load_dotenv()

s3_client = boto3.client("s3")
bucket = "calibrate-teamthrow"
demand_profile_path = Path(__file__).parent / "demand_profile.json"
trends_path = Path(__file__).parent / "trends.json"
postings_path = Path(__file__).parent / "active_postings.json"

def load_artifact(key, fallback_path):
    try:
        response = s3_client.get_object(Bucket=bucket, Key=key)
        return json.loads(response["Body"].read())
    except Exception as err:
        print(f"Falling back to the bundled {fallback_path.name}: {err}")

    with open(fallback_path) as json_file:
        return json.load(json_file)


def load_demand_profile():
    json_data = load_artifact("pipeline-data/demand_profile.json", demand_profile_path)

    profile = {}

    for role, role_data in json_data.items():
        if isinstance(role_data, list):
            skills = role_data
            postings_count = 200 # fallback
        else:
            skills = role_data.get("skills", [])
            postings_count = role_data.get("postings_count", 0)
        
        profile[role] = {
            "postings_count": postings_count,
            "skills": [DemandedSkill(**skill) for skill in skills]
        }

    return profile


def load_trends():
    return load_artifact("pipeline-data/trends.json", trends_path)


def load_postings():
    return load_artifact("pipeline-data/active_postings.json", postings_path)

if __name__ == "__main__":
    load_trends()


def drop_expired(postings: list[dict], today: str) -> list[dict]:
    """Postings whose closing date has not passed.

    build_postings.py already filters these out, but it does so once, and the artifact
    is then served for days. Anything with no closing date stays: plenty of boards
    never publish one, and dropping those would empty the page.
    """
    return [
        posting for posting in postings
        if not posting.get("closing_date") or posting["closing_date"] >= today
    ]

def build_skill_facts(postings: dict) -> dict:
    """What the live board says about each skill, so a project brief can be anchored
    to real demand instead of the agent's imagination."""
    entries = postings["postings"]
    total = len(entries)

    counts = Counter()
    roles = defaultdict(Counter)
    pairs = defaultdict(Counter)

    for posting in entries:
        for skill in posting["skills"]:
            counts[skill] += 1
            roles[skill][posting["role"]] += 1

            for other in posting["skills"]:
                if other != skill:
                    pairs[skill][other] += 1

    return {
        skill: {
            "postings": count,
            "share": round(100 * count / total, 1) if total else 0.0,
            "top_roles": [role for role, _ in roles[skill].most_common(3)],
            "paired_with": [other for other, _ in pairs[skill].most_common(5)],
        }
        for skill, count in counts.items()
    }
