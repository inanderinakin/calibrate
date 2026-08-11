import json
from pathlib import Path
from strands import Agent, tool
from dotenv import load_dotenv
from models import GapResult, Report

with open(Path(__file__).parent.parent / "resources.json") as resources_json_file:
    resources_json = json.load(resources_json_file)

with open(Path(__file__).parent.parent / "demand_profile.json") as demand_profile_file:
    demand_profile_json = json.load(demand_profile_file)

load_dotenv()

def load_role_demand(role: str) -> list[dict] | None:
    """The single source of demand data (later: reads the aggregator's artifacts)."""
    return demand_profile_json.get(role, None)


@tool
def get_role_demand(role: str):
    """This tool returns every demanded skill for one job role, with that skill's market frequency and trend. The argument is a job role taken from target_roles, such as Backend Engineer. It is never a skill name."""
    output = load_role_demand(role)
    if output is None:
        return f"{role} is not a role. Valid roles are: {', '.join(demand_profile_json)}"

    return output

@tool
def get_learning_resources(skill: str):
    'This tool returns courses or videos for that specific skill'
    output = resources_json.get(skill)

    if output is None:
        return f"We got no information for {skill}. Express to the user such that we do not have any resources for {skill} at the moment. Do not reccommend anything"

    return output

LANGUAGE_NAMES = {"tr": "Turkish", "en": "English"}

def get_recommendations(gaps: GapResult, language: str = "en"):
    language_name = LANGUAGE_NAMES.get(language, LANGUAGE_NAMES["en"])

    # callback handler none is to block the agent code to print the message to console.
    agent = Agent(model="global.anthropic.claude-sonnet-4-6", tools=[get_role_demand, get_learning_resources], callback_handler = None, structured_output_model = Report,
                system_prompt = ("Only use data returned by the tools. Never invent demand figures or resources. "
                                "Call get_role_demand once for every role in target_roles, passing that role name and never a skill name, and read each gap's market frequency and trend out of the list it returns. "
                                "Call get_learning_resources once for each gap skill. "
                                "Then produce a ranked list (most in-demand gaps first) of explainable recommendations. "
                                "Every recommendation must state its market-frequency reason ('X appears in 38 percent of postings…')."
                                "Never show raw numeric scores to the user."
                                "Rank strictly by market demand percentage, highest first."
                                f"Write the summary and every recommendation's reason in {language_name}. "
                                "Keep skill names, resource titles, and resource URLs exactly as returned by the tools — do not translate those."
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
