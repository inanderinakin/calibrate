"""
Sweeps the embedding threshold against the gold set.

Embeds once and re-applies each threshold to the cached scores, so the sweep costs
one Bedrock call rather than one per step. Replicates normalize() exactly: phrases
fall through to the embedder, single words are exact-match only.

Run from backend/:  python -m experiments.eval.sweep_threshold
"""
import json
from pathlib import Path

from handlecv.inputcv import extract_skill_candidates
from normalize import esco_normalizer, pairs, uri_to_label, vectors
from normalizer.embedding_matcher import match_candidates

gold = set(json.load(open(Path(__file__).parent / "beril_gold.json")))
lines = json.load(open(Path(__file__).parent / "beril_lines.json"))

candidates = extract_skill_candidates(lines=lines)
phrases = [candidate for candidate in candidates if " " in candidate]
words = [candidate for candidate in candidates if " " not in candidate]

# Exact hits are immune to the threshold, so they are resolved once and kept aside.
exact_labels = set()
unmatched_phrases = []

for phrase in phrases:
    uri = esco_normalizer.normalize_skill(phrase)
    if uri is None:
        unmatched_phrases.append(phrase)
    else:
        exact_labels.add(uri_to_label[uri])

for word in words:
    uri = esco_normalizer.normalize_skill(word)
    if uri is not None:
        exact_labels.add(uri_to_label[uri])

scored = [
    (query_text, uri_to_label[uri], float(score))
    for query_text, uri, score in match_candidates(
        candidates=unmatched_phrases, pairs=pairs, vectors=vectors, threshold=0.0
    )
    if uri is not None
]


def score_at(threshold):
    predicted = set(exact_labels)
    predicted |= {label for _, label, score in scored if score >= threshold}

    if not predicted:
        return 0.0, 0.0, 0.0, predicted

    true_positives = predicted & gold
    precision = len(true_positives) / len(predicted)
    recall = len(true_positives) / len(gold)
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return precision, recall, f1, predicted


print(f"{'thr':>5}{'P':>8}{'R':>8}{'F1':>8}{'kept':>7}{'lost vs 0.65':>14}")
print("-" * 50)

baseline = score_at(0.65)[3] & gold

for step in range(60, 86, 1):
    threshold = step / 100
    precision, recall, f1, predicted = score_at(threshold)
    lost = len(baseline - (predicted & gold))
    mark = "  <- current" if abs(threshold - 0.65) < 1e-9 else ""
    print(f"{threshold:>5.2f}{precision:>8.3f}{recall:>8.3f}{f1:>8.3f}{len(predicted):>7}{lost:>14}{mark}")
