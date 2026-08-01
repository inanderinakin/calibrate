import json
import random
import sys
from pathlib import Path
from handleposting import extract_posting_candidates
from normalize import normalize

postings_path = Path(__file__).parent / "scraper" / "postings.jsonl"
sample_size = int(sys.argv[1]) if len(sys.argv) > 1 else 10
role_filter = sys.argv[2] if len(sys.argv) > 2 else None

rows = []
with open(postings_path, "r", encoding="utf-8") as input_file:
    for line in input_file:
        if line.strip():
            row = json.loads(line)
            if len((row.get("description_text") or "").strip()) < 200:
                continue
            if role_filter and row.get("role") != role_filter:
                continue
            rows.append(row)

print(f"{len(rows)} postings available, sampling {min(sample_size, len(rows))}\n")

for row in random.sample(rows, min(sample_size, len(rows))):
    skills = normalize(extract_posting_candidates(row["description_text"]))
    print(row["title"])
    print(f"  company: {row.get('company')}")
    print(f"  role:    {row['role']}")
    print(f"  url:     {row.get('url')}")
    print(f"  skills:  {', '.join(sorted(skill.skill for skill in skills))}")
    print()
