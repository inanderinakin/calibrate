"""
Prints the score behind every match, so threshold decisions are made from data.

Replays the two passes normalize_phrases() uses internally, but keeps the similarity
score it discards. threshold=0.0 means every candidate reports its best match, including
ones that would normally be rejected -- that is the point: it shows where the skills we
MISS actually score.

NOTE: [GOLD] marks that the matched LABEL is in the gold set, NOT that the match is
correct. A junk candidate landing on a gold label still prints [GOLD]
(e.g. "çalışarak -> operating systems"). Read the candidate column, not just the marker.

Run from backend/:  python -m experiments.eval.eval_scores
"""
import json
from pathlib import Path
from handlecv.inputcv import extract_skill_candidates
from normalize import esco_normalizer, pairs, uri_to_label, vectors
from normalizer.embedding_matcher import match_candidates

with open(Path(__file__).parent / "beril_gold.json") as gold_file:
    gold_json = set(json.load(gold_file))

with open(Path(__file__).parent / "beril_lines.json") as lines_file:
    lines_json = json.load(lines_file)

candidates = extract_skill_candidates(lines=lines_json)

# (candidate, matched label, score, method) -- exact matches score 1.0 so they sort on top,
# and because an exact string hit is max confidence, immune to any threshold change.
records = []
missing = []
for candidate in candidates:
    uri = esco_normalizer.normalize_skill(candidate)
    if uri is None:
        missing.append(candidate)
    else:
        records.append((candidate, uri_to_label[uri], 1.0, "exact"))

for query_text, uri, score in match_candidates(candidates=missing, pairs=pairs, vectors=vectors, threshold=0.0):
    if uri is not None:
        records.append((query_text, uri_to_label[uri], float(score), "embed"))

records.sort(key=lambda record: record[2], reverse=True)

for candidate, label, score, method in records:
    mark = "[GOLD]" if label in gold_json else ""
    print(f"{score:.2f}  {method:5s}  {candidate[:28]:28s} -> {label:40s} {mark}")
