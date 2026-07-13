import os
from esco_utils import EscoNormalizer
from process_postings import PostingSkillExtractor

def main():
    # Define file pathways
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(current_dir, "esco_skills.csv")

    # Curated CS/IT postings from every scraper. Each file is the same schema,
    # so we just run the extractor over all of them.
    scraper_dir = os.path.join(current_dir, "..", "scraper")
    jsonl_paths = [
        os.path.join(scraper_dir, name)
        for name in (
            "postings_kariyer.jsonl",
            "postings_yenibiris.jsonl",
            "postings_secretcv.jsonl",
        )
    ]
    jsonl_paths = [p for p in jsonl_paths if os.path.exists(p)]
    if not jsonl_paths:
        print("No postings files found in backend/scraper/ — run a scraper first.")
        return

    # 1. Launch ESCO Normalizer class (T2.1 ve T2.2 ready to launch)
    print("ESCO Veri seti yükleniyor, bu işlem biraz sürebilir...")
    normalizer = EscoNormalizer(csv_path=csv_path)
    print(f"Succesfull! Total of {len(normalizer.label_to_uri_map)} different skills have been maped.")

    # 2. Launch Extractor class and start prossesing postings(T2.3)
    extractor = PostingSkillExtractor(normalizer=normalizer)
    results = []
    for jsonl_path in jsonl_paths:
        print(f"\n--- {os.path.basename(jsonl_path)} ---")
        results.extend(extractor.extract_from_jsonl(jsonl_path=jsonl_path))
    print(f"\nProcessed {len(results)} postings across {len(jsonl_paths)} source file(s).")

    # example
    if results:
        print("\n--- Example ---")
        print(f"Header/ID: {results[0].get('id', 'Unknown')}")
        print(f"Found skills: {results[0]['extracted_skills']}")

if __name__ == "__main__":
    main()