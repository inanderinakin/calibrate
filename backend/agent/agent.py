from strands import Agent, tool
from strands_tools import calculator, current_time
from dotenv import load_dotenv

load_dotenv()

@tool
def get_role_demand(role: str):
    """This tool returns the market demand numbers for a role. Role format should be plain"""
    demands = {
        "Software Engineer": {"demand_pct": "0.38", "trend": "Emerging"},
        "Data Scientist": {"demand_pct": "0.62", "trend": "Rising"},
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
        return f"We got no information for {skill}"

    return output


agent = Agent(tools=[calculator, current_time, get_role_demand, get_learning_resources],
              system_prompt = ("Only use data returned by the tools. Never invent demand figures or resources."
                               "Every recommendation must state its market-frequency reason ('X appears in 38 percent of postings…')."
                               "Never show raw numeric scores to the user."
                               ))

message = "Can you tell me the demand for Software Engineering role and learning resources for Docker?"

agent(message)
