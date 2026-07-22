import re
import jsonlines as jl
from pathlib import Path
from normalize import normalize_skills, normalize_posting

def extract_posting_candidates(description: str) -> list[str]:
    candidates = []
    candidates_raw_1 = re.split(r'[(),/\n]', description)
    for candidate in candidates_raw_1:
        if len(candidate) > 2 and len(candidate) < 39:
            if ":" in candidate or ";" in candidate:
                continue
            else:
                candidates.append(candidate.strip())
    
    candidates_raw_2 = description.split()
    for candidate in candidates_raw_2:
        if ":" in candidate or ";" in candidate:
            continue
        else:
            candidate = candidate.strip(".,!?()\"'")
            candidates.append(candidate)
    candidates = list(dict.fromkeys(candidates))
    return candidates

if __name__ == "__main__":
    with jl.open((Path(__file__).parent / "scraper" / "postings.jsonl")) as reader:
        for obj in reader:
            if obj['title'] == "Full Stack Mühendisi":
                candidates = extract_posting_candidates(description= obj["description_text"])
                normalized = normalize_posting(candidates=candidates)
                print(normalized)
                # new_list = list(filter(None, normalized))
                # for item in new_list:
                #     print(item.skill)
                break
            
    
                        