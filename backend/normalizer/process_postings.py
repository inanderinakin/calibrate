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
                # mergeing the opportunity with 
                description = obj.get("description", "")
                criteria = obj.get("criteria", "")
                full_text = f" {description} {criteria} ".lower()
                
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