"""
Measures what the verifier adds on top of the embedding matcher.

Replays /upload_cv on the frozen Textract lines, then runs the verifier over the
result, and scores both against the gold set so the delta is visible.

Run from backend/:  python -m experiments.eval.eval_verifier
"""
import json
from pathlib import Path

from agent.verifier import verify_skills
from handlecv.inputcv import extract_skill_candidates
from models import NormalizedSkill
from normalize import normalize
from skills import PATTERNS, SKILL_CATEGORIES, base_skill_name

# Gold is written in ESCO labels; the pipeline now prefers the keyword name for a
# skill found by both. Comparing base names keeps that from counting as a miss.
gold = {base_skill_name(name) for name in json.load(open(Path(__file__).parent / "beril_gold.json"))}
lines = json.load(open(Path(__file__).parent / "beril_lines.json"))


def score(predicted):
    names = {base_skill_name(skill.skill) for skill in predicted}
    true_positives = names & gold
    precision = len(true_positives) / len(names) if names else 0.0
    recall = len(true_positives) / len(gold)
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return precision, recall, f1, names


# --- what /upload_cv produces today ---
candidates = extract_skill_candidates(lines)
normalized = normalize(candidates=candidates)
joined = "\n".join(lines)

before = [
    NormalizedSkill(skill=term, esco_category=SKILL_CATEGORIES[term])
    for term, pattern in PATTERNS.items() if pattern.search(joined)
]
covered = {base_skill_name(skill.skill) for skill in before}

for skill in normalized:
    if base_skill_name(skill.skill) in covered:
        continue
    before.append(skill)
    covered.add(base_skill_name(skill.skill))

# --- and after the verifier reads it ---
after, verdicts = verify_skills(before, lines)

p0, r0, f0, names_before = score(before)
p1, r1, f1_, names_after = score(after)

print(f"{'':10}{'P':>8}{'R':>8}{'F1':>8}{'kept':>7}")
print("-" * 41)
print(f"{'before':10}{p0:>8.3f}{r0:>8.3f}{f0:>8.3f}{len(names_before):>7}")
print(f"{'after':10}{p1:>8.3f}{r1:>8.3f}{f1_:>8.3f}{len(names_after):>7}")

dropped = names_before - names_after
print(f"\ndropped {len(dropped)}:")
for name in sorted(dropped):
    verdict = next((v for v in verdicts if base_skill_name(v.skill) == name), None)
    mark = "WRONGLY" if name in gold else "correctly"
    reason = "no quote in CV" if verdict and verdict.supported else "unsupported"
    print(f"   {mark:9s} {name:45s} ({reason})")

survived = names_after - gold
print(f"\nfalse positives the verifier let through ({len(survived)}):")
for name in sorted(survived):
    verdict = next((v for v in verdicts if base_skill_name(v.skill) == name), None)
    print(f"   {name:45s} evidence: {verdict.evidence[:50] if verdict else ''!r}")
