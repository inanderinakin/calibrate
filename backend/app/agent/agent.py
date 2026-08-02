import json
from pathlib import Path
from strands import Agent, tool
from dotenv import load_dotenv
from models import GapResult, Report

with open(Path(__file__).parent.parent / "resources.json") as resources_json_file:
    resources_json = json.load(resources_json_file)

load_dotenv()

def load_role_demand(role: str) -> list[dict] | None:
    """The single source of demand data (later: reads the aggregator's artifacts)."""
    with open((Path(__file__).parent.parent / "demand_profile.json")) as json_file:
        json_data = json.load(json_file)
        return json_data[role]

@tool
def get_role_demand(role: str):
    """This tool returns the market demand numbers for a role. Role format should be plain"""
    output = load_role_demand(role)

    if output is None:
        return f"We got no information for {role}"

    return output

@tool
def get_learning_resources(skill: str):
    'This tool returns courses or videos for that specific skill'
    output = resources_json.get(skill)

    if output is None:
        return f"We got no information for {skill}. Express to the user such that we do not have any resources for {skill} at the moment. Do not reccommend anything"

    return output

def get_recommendations(gaps: GapResult):
    # callback handler none is to block the agent code to print the message to console.
    agent = Agent(model="global.anthropic.claude-sonnet-4-6", tools=[get_role_demand, get_learning_resources], callback_handler = None, structured_output_model = Report,
                system_prompt = ("Only use data returned by the tools. Never invent demand figures or resources."
                                "For each gap, get it's role demand to get its market frequency and trend, Get the learning resources for that skill, then produce a ranked list (most in-demand gaps first) of explainable recommendations."
                                "Every recommendation must state its market-frequency reason ('X appears in 38 percent of postings…')."
                                "Never show raw numeric scores to the user."
                                "Rank strictly by market demand percentage, highest first"
                                ))

    result = agent(gaps.model_dump_json() + "Here are the student's skill gaps. For each one, produce a recommendation.")
    report = result.structured_output

    demand: dict[str, float] = {}
    for role in gaps.target_roles:
        for item in load_role_demand(role) or []:
            demand[item["skill"]] = max(demand.get(item["skill"], 0.0), float(item["demand_percentage"]))

    report.recommendations.sort(key=lambda r: demand.get(r.skill, 0.0), reverse=True)
    for i, rec in enumerate(report.recommendations, start=1):
        rec.rank = i

    return report

if __name__ == "__main__":
    gaps = {
        "target_roles": ["Data Scientist"],
        "gaps": {
            "Data Scientist": [
                {"skill": "Docker", "esco_category": "containerization", "closest_cv_skill": "Kubernetes", "demand_percentage": 0.45, "trend": "Stable"},
                {"skill": "SQL", "esco_category": "query languages", "demand_percentage": 0.67, "trend": "Stable"}
            ]
        },
        "matched_data": {
            "Data Scientist": {"matched_demanded": 3, "total_demanded": 5, "ratio": 0.6}
        }
    }
    parsedData = GapResult(**gaps)

    with open(Path(__file__).parent.parent / "example_result.json", "w", encoding="utf-8") as json_file:
        json.dump(get_recommendations(parsedData).model_dump(), json_file, indent=4)
