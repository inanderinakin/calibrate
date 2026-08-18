"""
Checks extracted skills against the CV they supposedly came from.

The embedding matcher scores similarity, not truth, and the two are not the same
thing: "azaltılmasına" ("to its reduction") scores 0.72 against "perform
dimensionality reduction", higher than "Yazılım Testi" scores against "execute
software tests", which is a real skill. No threshold separates those, because the
problem is meaning rather than distance.

So the verifier reads. It gets the CV text and the extracted list, and for every
skill it has to quote the words that back it up. A skill it cannot quote for is
dropped. It only ever removes -- it is never asked to name a skill itself, so it
cannot invent one.
"""
from strands import Agent
from dotenv import load_dotenv

from agent.style import PLAIN_STYLE
from models import NormalizedSkill, SkillVerdicts

load_dotenv()

model_id = "global.anthropic.claude-sonnet-4-6"

system_prompt = (
    "You check whether skills pulled out of a CV are really claimed by that CV. "
    "For every skill you are given, decide if the CV supports it and quote the exact words from the CV that do. "
    "Quote only text that appears in the CV. If you cannot find words that support a skill, mark it unsupported and leave the evidence empty. "
    "A skill is supported when the CV names it, names a tool or technology that is an instance of it, or describes doing it. "
    "An abbreviation counts as naming it: ML is machine learning, CI/CD is continuous integration, OOP is object-oriented programming. "
    "Quote the abbreviation itself as the evidence when that is what the CV uses. "
    "A skill is NOT supported when the match rests only on a word looking similar, on a hobby, on a course title, or on what a project did for its users rather than what the person did. "
    "Judge only what is written. Do not reason about what someone with this background probably also knows. "
    "Return a verdict for every skill you were given, using the skill name exactly as it was given to you. "
    + PLAIN_STYLE
)


def verify_skills(skills: list[NormalizedSkill], lines: list[str]) -> tuple[list[NormalizedSkill], list[SkillVerdicts]]:
    """Returns the skills the CV backs up, plus the verdicts behind the decision."""
    if not skills:
        return [], []

    agent = Agent(
        model = model_id,
        callback_handler = None,
        structured_output_model = SkillVerdicts,
        system_prompt = system_prompt,
    )

    cv_text = "\n".join(lines)
    skill_list = "\n".join(f"- {skill.skill}" for skill in skills)

    result = agent(
        f"CV:\n{cv_text}\n\nSkills to check:\n{skill_list}\n\n"
        "Return a verdict for each skill."
    )
    verdicts = result.structured_output.verdicts

    # An evidence quote that is not actually in the CV is a hallucinated one, so the
    # skill it was meant to support does not survive on it. Textract breaks the CV
    # into lines mid-sentence, so a real quote often spans one -- both sides get
    # their whitespace collapsed before the check.
    haystack = " ".join(cv_text.split()).casefold()
    supported = {
        verdict.skill
        for verdict in verdicts
        if verdict.supported and " ".join(verdict.evidence.split()).casefold() in haystack
    }

    return [skill for skill in skills if skill.skill in supported], verdicts
