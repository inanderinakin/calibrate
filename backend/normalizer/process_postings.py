from pathlib import Path

import jsonlines
import pandas as pd
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

if __name__ == "__main__":
    collection_csv_path = (Path(__file__).parent / "esco_dataset" / "digitalSkillsCollection_en.csv")
    skills_csv_path = (Path(__file__).parent / "esco_dataset" / "skills_en.csv")
    catalog_csv_path = (Path(__file__).parent / "esco_dataset" / "catalog.csv")

    collection_df = pd.read_csv(collection_csv_path)
    skills_df = pd.read_csv(skills_csv_path)

    collection_uris = set(collection_df["conceptUri"])
    catalog_df = skills_df[skills_df["conceptUri"].isin(collection_uris)]
    
    catalog_df = catalog_df.drop_duplicates(subset="conceptUri")
    normalizer = EscoNormalizer(csv_path=catalog_csv_path)
    extractor = PostingSkillExtractor(normalizer=normalizer)

    jsonl_csv_path = (Path(__file__).parent.parent / "scraper" / "postings.jsonl")
    postings = extractor.extract_from_jsonl(jsonl_path=jsonl_csv_path)

    for i in range (0, 5):
        print(postings[i])