import json
from pathlib import Path
from typing_extensions import Literal
from strands import Agent, tool
from strands_tools import calculator, current_time
from dotenv import load_dotenv
from models import GapResult, Recommendation, Report, Resource

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
    """This tool returns courses or videos for that specific skill"""
    resources = {
        "Docker": [
            {"title": "Docker Official Docs", "url": "https://docs.docker.com", "type": "documentation", "language": "en" },
        ]
    }

    output = resources.get(skill)

    if output is None:
        return f"We got no information for {skill}. Express to the user such that we do not have any resources for {skill} at the moment. Do not reccommend anything"

    return output

def get_recommendations(gaps: GapResult):
    # callback handler none is to block the agent code to print the message to console.
    agent = Agent(tools=[calculator, current_time, get_role_demand, get_learning_resources], callback_handler = None, structured_output_model = Report,
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
                {"skill": "Docker", "esco_category": "containerization", "closest_cv_skill": "Kubernetes"},
                {"skill": "SQL", "esco_category": "query languages"}
            ]
        } 
    }
    parsedData = GapResult(**gaps)
    print(get_recommendations(parsedData))
