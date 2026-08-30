"""
Turns a skill gap into something a recruiter can see.

A roadmap that says "learn Docker" has no finish line, and a project that merely
mentions Docker proves nothing -- the same app can be built with almost anything.
So a project is a step of the roadmap in its own right, sitting after the skills it
makes you combine: learn C#, learn SQL, then build the thing that needs both. It has
to name a build that collapses without those skills, and a completion goal specific
enough that the student knows when they are done.

That goal is doing double duty: it is also the "as measured by" clause of the CV
bullet, which is why the bullet can be written later without inventing anything.

Demand numbers come from the live postings via a tool, never from the model.
"""
from strands import Agent, tool
from dotenv import load_dotenv

from handleposting import build_skill_facts, load_postings
from agent.style import PLAIN_STYLE
from models import BulletRequest, CvBullet, ProjectStep, ProjectSteps, Recommendation

load_dotenv()

model_id = "global.anthropic.claude-sonnet-4-6"
skill_facts = build_skill_facts(load_postings())

LANGUAGE_NAMES = {"tr": "Turkish", "en": "English"}

@tool
def get_skill_demand(skill: str):
    """Returns what the live job board says about one skill: how many postings ask for
    it, what share of the board that is, which roles ask for it, and which skills it is
    most often asked for alongside. The argument is a skill name such as Docker."""
    facts = skill_facts.get(skill)

    if facts is None:
        return f"The board has no postings asking for {skill}. Say so rather than guessing a number."

    return facts

brief_prompt = (
    "You write the project steps of a learning roadmap. "
    "Each step comes after a group of skills the student has just worked through, and its job is to make them put those "
    "skills together in one build -- learn C# and SQL, then build the thing that needs both. "
    "Call get_skill_demand once for every skill in the group before writing that step, and take every number from it. "
    "Never state a demand figure the tool did not return. "
    "Each step describes one small project the student could finish in a few days, using EVERY skill in its group. "
    "The project must be one that CANNOT be completed without those skills: pick requirements that force each skill's "
    "particular strength, not a generic app they happen to appear in. A cache that could be a dictionary, or a "
    "container that could be a script, proves nothing. "
    "If a group has two skills, the build has to genuinely need both, not use one and mention the other. "
    "The completion goal must be a single checkable statement about the finished thing: a number to hit, a failure to "
    "survive, a behaviour to demonstrate. Not 'understand X' or 'learn Y'. The student has to be able to say whether it is true. "
    "Keep it tight. The brief is at most 45 words. The completion goal is at most 30 words. The forces field is one sentence "
    "of at most 25 words. The demand_note is at most 15 words. A student skims this on a phone, so every word has to earn its place. "
    "The demand_note quotes the tool's figures for the group, for example '128 postings ask for Docker, 84 for Kubernetes'. "
    "Use the skill names exactly as they were given to you, and copy each group's skills and after_rank into the step unchanged."
)

bullet_prompt = (
    "You turn a finished project into one CV bullet. "
    "Use the shape: accomplished X, as measured by Y, by doing Z. The completion goal is Y. "
    "Write exactly one sentence of at most 35 words, in the first person past tense, no bullet character, no name. "
    "Use only what the brief and the student's notes say. Invent no numbers, no team sizes, no company names, no dates. "
    "If the student gave notes with real figures, prefer those over the goal's wording. "
    "Name the skills and the concrete technique the project forced."
)

def group_skills(recommendations: list[Recommendation], size: int = 2) -> list[dict]:
    """Walks the ranked roadmap and cuts it into groups, so a project lands after every
    `size` skills rather than at the end where nobody reaches it."""
    groups = []

    for start in range(0, len(recommendations), size):
        chunk = recommendations[start:start + size]

        if not chunk:
            continue

        groups.append({
            "skills": [item.skill for item in chunk],
            "after_rank": chunk[-1].rank,
        })

    return groups

def get_project_steps(recommendations: list[Recommendation], language: str = "en") -> list[ProjectStep]:
    groups = group_skills(recommendations)

    if not groups:
        return []

    language_name = LANGUAGE_NAMES.get(language, LANGUAGE_NAMES["en"])

    agent = Agent(
        model = model_id,
        tools = [get_skill_demand],
        callback_handler = None,
        structured_output_model = ProjectSteps,
        system_prompt = brief_prompt + " " + PLAIN_STYLE + f" Write every field in {language_name}, but keep skill and tool names in English.",
    )

    described = "\n".join(
        f"- group after_rank={group['after_rank']}: {', '.join(group['skills'])}" for group in groups
    )
    result = agent(f"Write one project step for each of these skill groups:\n{described}")
    return result.structured_output.steps

def get_cv_bullet(request: BulletRequest) -> str:
    language_name = LANGUAGE_NAMES.get(request.language, LANGUAGE_NAMES["en"])

    agent = Agent(
        model = model_id,
        callback_handler = None,
        structured_output_model = CvBullet,
        system_prompt = bullet_prompt + " " + PLAIN_STYLE + f" Write it in {language_name}, keeping skill and tool names in English.",
    )

    result = agent(
        f"Project: {request.step.title}\n"
        f"Skills: {', '.join(request.step.skills)}\n"
        f"What was built: {request.step.brief}\n"
        f"Completion goal reached: {request.step.completion_goal}\n"
        f"What the project forced: {request.step.forces}\n"
        f"Student's notes: {request.notes or '(none)'}\n\n"
        "Write the bullet."
    )
    return result.structured_output.bullet
