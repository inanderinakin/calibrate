import json
from pathlib import Path
from relevance import load_dedup_index, is_duplicate_posting, register_posting

postings_path = Path(__file__).parent / "postings.jsonl"
linkedin_path = Path.home() / "Code/projects/linkedin_jobs/postings_linkedin.jsonl"
crawl_date = "2026-07-29"

dedup_index = load_dedup_index(postings_path)

existing_ids = set()
with open(postings_path, "r", encoding="utf-8") as input_file:
    for line in input_file:
        if line.strip():
            existing_ids.add(str(json.loads(line)["id"]))

skipped_by_id = 0
skipped_as_duplicate = 0
appended = 0

with open(linkedin_path, "r", encoding="utf-8") as input_file, open(postings_path, "a", encoding="utf-8") as output_file:
    for line in input_file:
        if line.strip():
            row = json.loads(line)
            if str(row["id"]) in existing_ids:
                skipped_by_id += 1
                continue
            if is_duplicate_posting(row, dedup_index):
                skipped_as_duplicate += 1
                continue
            row["first_seen"] = crawl_date
            register_posting(row, dedup_index)
            existing_ids.add(str(row["id"]))
            output_file.write(json.dumps(row, ensure_ascii=False) + "\n")
            appended += 1

print(f"skipped by id: {skipped_by_id}")
print(f"skipped as duplicate: {skipped_as_duplicate}")
print(f"appended: {appended}")
