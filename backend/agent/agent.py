from strands import Agent, tool
from strands_tools import calculator, current_time
from dotenv import load_dotenv
import json

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


agent = Agent(tools=[calculator, current_time, get_role_demand, get_learning_resources],
              system_prompt = ("Only use data returned by the tools. Never invent demand figures or resources."
                               "For each gap, get it's role demand to get its market frequency and trend, Get the learning resources for that skill, then produce a ranked list (most in-demand gaps first) of explainable recommendations."
                               "Every recommendation must state its market-frequency reason ('X appears in 38 percent of postings…')."
                               "Never show raw numeric scores to the user."
                               ))

gapsJson = {
    "target_roles": ["Data Scientist"],
    "gaps": [
        { "skill": "Docker", "esco_category": "containerization", "closest_cv_skill": "Kubernetes" },
        { "skill": "Python", "esco_category": "ict", "closest_cv_skill": "Java" },
    ]
}

agent(json.dumps(gapsJson) + "Here are the student's skill gaps. For each one, produce a recommendation.")
