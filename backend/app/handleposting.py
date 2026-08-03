import json
from pathlib import Path
from models import DemandedSkill

demand_profile_path = Path(__file__).parent / "demand_profile.json"
trends_path = Path(__file__).parent / "trends.json"


def load_demand_profile():
    with open(demand_profile_path) as json_file:
        json_data = json.load(json_file)

        profile = {}

        for role in json_data:
            profile[role] = list()
            for skill in json_data[role]:
                profile[role].append(DemandedSkill(**skill))

    return profile


def load_trends():
    with open(trends_path) as json_file:
        return json.load(json_file)
