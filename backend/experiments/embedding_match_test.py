import json
import pandas as pd
from pathlib import Path
import boto3
from dotenv import load_dotenv
import numpy as np

load_dotenv()
client = boto3.client("bedrock-runtime")

def embed_list(text_list: list[str], input_type: str):
    response = client.invoke_model(
        modelId="cohere.embed-multilingual-v3", 
        body=json.dumps({"texts": text_list, "input_type": input_type})
    )
    return json.loads(response["body"].read())["embeddings"]

collection_csv_path = (Path(__file__).parent.parent / "normalizer" / "esco_dataset" / "digitalSkillsCollection_en.csv")
skills_csv_path = (Path(__file__).parent.parent / "normalizer" / "esco_dataset" / "skills_en.csv")

collection_df = pd.read_csv(collection_csv_path)
skills_df = pd.read_csv(skills_csv_path)

collection_uris = set(collection_df["conceptUri"])
catalog_df = skills_df[skills_df["conceptUri"].isin(collection_uris)]
catalog_df = catalog_df.drop_duplicates(subset="conceptUri")

pairs = []
for index, row in catalog_df.iterrows():
    if 'preferredLabel' in row and pd.notna(row['preferredLabel']):
        pairs.append((str(row['preferredLabel']), str(row['conceptUri'])))

    if 'altLabels' in row and pd.notna(row['altLabels']):
        split_labels = str(row['altLabels']).split("\n")
        for label in split_labels:
            pairs.append((label, str(row['conceptUri'])))

print(f"Collection URIs: {len(collection_uris)}")
print(f"Catalog DF: {len(catalog_df)}")
print(f"Pairs: {len(pairs)}")

save_path = Path(__file__).parent / "vectors_array.npy"
if save_path.exists():
    vectors = np.load(save_path)
else:
    vectors_list = []
    for i in range(0, len(pairs), 96):
        vectors_list.extend(embed_list(
            text_list = [label for label, uri in pairs[i:i+96]],
            input_type = "search_document"
            ))
    vectors = np.array(vectors_list)
    np.save(save_path, vectors)

print(f"Vectors NP Array Shape: {vectors.shape}")

test_list = [
    ("SQL", "http://data.europa.eu/esco/skill/598de5b0-5b58-4ea7-8058-a4bc4d18c742"),
    ("Haskell", "http://data.europa.eu/esco/skill/000f1d3d-220f-4789-9c0a-cc742521fb02"),
    ("Postgres", "http://data.europa.eu/esco/skill/a8d07b5a-c1a1-42c6-9d53-db9c7a2ca996"),
    ("data science", "http://data.europa.eu/esco/skill/edebd83d-35f6-4ed5-a940-6c203d178c01"),
    ("Veri Bilimi", "http://data.europa.eu/esco/skill/edebd83d-35f6-4ed5-a940-6c203d178c01"),
    ("Veritabanı Yönetimi", "http://data.europa.eu/esco/skill/ab1e97ed-2319-4293-a8b7-072d2648822f"),
    ("satranç", None)
]

test_vectors = embed_list(text_list = [q for q, uri in test_list], input_type = "search_query")

for (query_text, gold_uri), query_vector in zip(test_list, test_vectors):
    scores = vectors @ query_vector
    ranked = np.argsort(scores)[::-1]
    print(f"{query_text} {pairs[ranked[0]][0]} {scores[ranked[0]]}")

    if gold_uri is None:
        if scores[ranked[0]] < 0.6:
            print("HIT")
    else:
        if pairs[ranked[0]][1] == gold_uri:
            print("HIT")
        else:
            print("Miss")