import json
from pathlib import Path

with open(Path(__file__).parent / "postings.jsonl", "r", encoding="utf-8") as input_file, open(Path(__file__).parent / "new_postings.jsonl", "w", encoding="utf-8") as output_file:
     
    for line in input_file:
        if line.strip():  
            row = json.loads(line)
            first_seen = row.get("first_seen")
            if first_seen is None:
                row["first_seen"] = "2026-07-19"
            output_file.write(json.dumps(row, ensure_ascii=False) + "\n")
            
            
        

