from strands import Agent, tool
from strands_tools import calculator, current_time
from dotenv import load_dotenv
from pydantic import BaseModel
import json

class Gap(BaseModel): 
    skill: str
    esco_category: str
    # the none = none makes this field optional (both buing null or not given at all)
    closest_cv_skill: str | None = None

class GapResult(BaseModel): 
    target_roles: list[str]
    gaps: list[Gap]

load_dotenv()

@tool
def get_role_demand(role: str):
    """This tool returns the market demand numbers for a role. Role format should be plain"""
    demands = {
        "Data Scientist": [
            {"skill": "Python", "demand_pct": "0.91", "trend": "Stable"},
            {"skill": "Docker", "demand_pct": "0.48", "trend": "Emerging"},
            {"skill": "SQL",    "demand_pct": "0.74", "trend": "Stable"},
        ],
    }

    output = demands.get(role)

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

def get_recommendations(gaps: dict):
    # callback handler none is to block the agent code to print the message to console.
    agent = Agent(tools=[calculator, current_time, get_role_demand, get_learning_resources], callback_handler = None,
                system_prompt = ("Only use data returned by the tools. Never invent demand figures or resources."
                                "For each gap, get it's role demand to get its market frequency and trend, Get the learning resources for that skill, then produce a ranked list (most in-demand gaps first) of explainable recommendations."
                                "Every recommendation must state its market-frequency reason ('X appears in 38 percent of postings…')."
                                "Never show raw numeric scores to the user."
                                ))

    result = agent(json.dumps(gaps) + "Here are the student's skill gaps. For each one, produce a recommendation.")
    return result.message["content"][0]["text"]

if __name__ == "__main__":
    gaps = {
        "target_roles": ["Data Scientist"],
        "gaps": [
        { "skill": "Docker", "esco_category": "containerization", "closest_cv_skill": "Kubernetes" },
        ]
    }
    print(get_recommendations(gaps))
