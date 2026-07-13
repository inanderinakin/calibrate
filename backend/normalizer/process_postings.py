import jsonlines
from .esco_utils import EscoNormalizer

class PostingSkillExtractor:
    def __init__(self, normalizer: EscoNormalizer):
        self.normalizer = normalizer

    def extract_from_jsonl(self, jsonl_path: str) -> list:
        """T2.3: Reads the scraped postings file, extracts skills, and normalizes them."""
        processed_postings = []
        
        # All known ESCO labels
        available_labels = list(self.normalizer.label_to_uri_map.keys())
        
        print(f"{jsonl_path} dosyası işleniyor...")
        
        with jsonlines.open(jsonl_path) as reader:
            for idx, obj in enumerate(reader):
                # The scrapers emit "description_text" and a "candidate_criteria"
                # dict; keep the old "description"/"criteria" keys as fallbacks.
                description = obj.get("description_text") or obj.get("description", "")
                crit = obj.get("candidate_criteria") or obj.get("criteria", "")
                if isinstance(crit, dict):
                    crit = " ".join(str(v) for v in crit.values())
                full_text = f" {description} {crit} ".lower()
                
                matched_skills = {}
                
                # simple-text finder
                for label in available_labels:
                    # space control
                    if f" {label} " in full_text:
                        uri = self.normalizer.normalize_skill(label)
                        if uri:
                            matched_skills[label] = uri
                
                # Merge the extracted info to JSON object
                obj["extracted_skills"] = matched_skills
                processed_postings.append(obj)
                
                print(f"Posting has {idx+1}: {len(matched_skills)} number of matching talents.")
                
        return processed_postings