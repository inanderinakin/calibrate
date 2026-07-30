import collections
import json
import os
from pathlib import Path
from roles import map_to_role

postings_path = Path(__file__).parent / "postings.jsonl"
temp_path = Path(__file__).parent / "postings.jsonl.tmp"

before = collections.Counter()
after = collections.Counter()
total = 0
changed = 0

with open(postings_path, "r", encoding="utf-8") as input_file, open(temp_path, "w", encoding="utf-8") as output_file:
    for line in input_file:
        if line.strip():
            row = json.loads(line)
            total += 1
            old_role = row.get("role")
            new_role = map_to_role(row.get("title"), row.get("description_text"))
            before[old_role] += 1
            after[new_role] += 1
            if old_role != new_role:
                changed += 1
            row["role"] = new_role
            output_file.write(json.dumps(row, ensure_ascii=False) + "\n")

os.replace(temp_path, postings_path)

print(f"{total} postings, {changed} labels changed")
for role in after:
    print(f"{role}: {before[role]} -> {after[role]}")
