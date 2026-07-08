import os
from esco_utils import EscoNormalizer
from process_postings import PostingSkillExtractor

def main():
    # Define file pathways
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(current_dir, "esco_skills.csv")
    jsonl_path = os.path.join(current_dir, "postings.jsonl")
    
    # 1. Launch ESCO Normalizer class (T2.1 ve T2.2 ready to launch)
    print("ESCO Veri seti yükleniyor, bu işlem biraz sürebilir...")
    normalizer = EscoNormalizer(csv_path=csv_path)
    print(f"Succesfull! Total of {len(normalizer.label_to_uri_map)} different skills have been maped.")
    
    # 2. Launch Extractor class and start prossesing postings(T2.3)
    extractor = PostingSkillExtractor(normalizer=normalizer)
    results = extractor.extract_from_jsonl(jsonl_path=jsonl_path)
    
    # example
    if results:
        print("\n--- Example ---")
        print(f"Header/ID: {results[0].get('id', 'Unknown')}")
        print(f"Found skills: {results[0]['extracted_skills']}")

if __name__ == "__main__":
    main()