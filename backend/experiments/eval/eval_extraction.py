"""
Measures CV skill-extraction quality against a hand-labelled gold set.

Replays what /upload_cv does (main.py) minus Textract: the CV's Textract lines are
frozen in beril_lines.json, so runs are cheap and repeatable.

    frozen lines -> extract_skill_candidates -> normalize -> compare to gold

Run from backend/:  python -m experiments.eval.eval_extraction
"""
import json
from pathlib import Path
from handlecv.inputcv import extract_skill_candidates
from normalize import normalize

with open(Path(__file__).parent / "beril_gold.json") as gold_file:
    gold_json = set(json.load(gold_file))

with open(Path(__file__).parent / "beril_lines.json") as lines_file:
    lines_json = json.load(lines_file)

candidates = extract_skill_candidates(lines=lines_json)
normalized = normalize(candidates=candidates)

predicted = set()
for normalized_skill in normalized:
    if normalized_skill is not None:
        predicted.add(normalized_skill.skill)

tp = predicted & gold_json
fp = predicted - gold_json
fn = gold_json - predicted
precision = len(tp) / len(predicted)
recall = len(tp) / len(gold_json)
f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0

print(f"false positives ({len(fp)}):")
for skill in sorted(fp):
    print("   ", skill)
print(f"false negatives ({len(fn)}):")
for skill in sorted(fn):
    print("   ", skill)
print(f"precision {precision:.3f}  recall {recall:.3f}  f1 {f1:.3f}")
