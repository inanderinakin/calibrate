import json
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

    for role in json_data:
        profile[role] = list()
        for skill in json_data[role]:
            profile[role].append(DemandedSkill(**skill))

    return profile


def load_trends():
    return load_artifact("pipeline-data/trends.json", trends_path)

if __name__ == "__main__":
    load_trends()
