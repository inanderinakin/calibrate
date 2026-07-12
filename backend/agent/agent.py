from typing_extensions import Literal

from strands import Agent, tool
from strands_tools import calculator, current_time
from dotenv import load_dotenv
from pydantic import BaseModel
from models import GapResult

class Resource(BaseModel):
    title: str
    url: str
    type: Literal["documentation", "video", "course"]
    language: Literal["tr", "en"]

class Recommendation(BaseModel):
    rank: int
    skill: str
    esco_category: str
    reason: str
    trend: Literal["Emerging", "Stable", "Fading"]
    closest_cv_skill: str | None = None
    resources: list[Resource]

class Report(BaseModel):
    target_roles: list[str]
    summary: str
    recommendations: list[Recommendation]

load_dotenv()

def load_role_demand(role: str) -> list[dict] | None:
    """The single source of demand data (later: reads the aggregator's artifacts)."""
    demands = {
        "Data Scientist": [
            {"skill": "Python", "demand_pct": 0.91, "trend": "Stable"},
            {"skill": "Docker", "demand_pct": 0.48, "trend": "Emerging"},
            {"skill": "SQL",    "demand_pct": 0.74, "trend": "Stable"},
        ],
    }
    return demands.get(role)

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

    # The deterministic stage owns ranking — rebuild it from real demand numbers,
    # discarding whatever order the model chose.
    demand: dict[str, float] = {}
    for role in gaps.target_roles:
        for item in load_role_demand(role) or []:
            demand[item["skill"]] = max(demand.get(item["skill"], 0.0), float(item["demand_pct"]))

    report.recommendations.sort(key=lambda r: demand.get(r.skill, 0.0), reverse=True)
    for i, rec in enumerate(report.recommendations, start=1):
        rec.rank = i

    return report

if __name__ == "__main__":
    gaps = {
        "target_roles": ["Data Scientist"],
        "gaps": [
        { "skill": "Docker", "esco_category": "containerization", "closest_cv_skill": "Kubernetes" },
        { "skill": "SQL", "esco_category": "database" }
        ]
    }

    parsedData = GapResult(**gaps)

    print(get_recommendations(parsedData))
