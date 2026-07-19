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

test_list = [
    # A. English exacts / sanity
    ("Python",            ["Python (computer programming)"]),
    ("Java",              ["Java (computer programming)"]),          # landmine: JavaScript nearby
    ("JavaScript",        ["JavaScript"]),
    ("TypeScript",        ["TypeScript"]),
    ("C#",                ["C#"]),
    ("machine learning",  ["machine learning", "utilise machine learning"]),  # knowledge-vs-skill siblings
    ("cyber security",    ["cyber security"]),
    ("business intelligence", ["business intelligence"]),
    ("SQL",               ["SQL"]),                                  # resolves to BOTH URIs automatically
    ("data science",      ["data science"]),

    # B. Variants / abbreviations
    ("JS",                ["JavaScript"]),
    ("MSSQL",             ["MS SQL Server"]),
    ("PostgreSQL",        ["Postgres"]),

    # C. Turkish translations — the load-bearing category
    ("Veri Bilimi",       ["data science"]),
    ("Makine Öğrenmesi",  ["machine learning", "utilise machine learning"]),
    ("Yapay Zeka",        ["principles of artificial intelligence"]),
    ("Siber Güvenlik",    ["cyber security"]),
    ("Bulut Güvenliği",   ["cloud security and compliance"]),
    ("Veri Madenciliği",  ["data mining", "perform data mining", "data mining methods"]),
    ("Veri Görselleştirme", ["data visualisation software", "deliver visual presentation of data"]),
    ("Nesnelerin İnterneti", ["Internet of Things"]),
    ("İşletim Sistemleri", ["operating systems"]),
    ("Web Programlama",   ["web programming"]),
    ("Çevik Proje Yönetimi", ["Agile project management"]),
    ("Kelime İşlemci",    ["use word processing software"]),
    ("Arama Motoru Optimizasyonu", ["search engine optimisation", "conduct search engine optimisation"]),
    ("Şifreleme",         ["ICT encryption"]),
    ("Veritabanı Yönetimi", ["manage database", "database management systems"]),

    # D. Junk — must be rejected (gold None)
    ("satranç",           None),
    ("ehliyet",           None),   # driver's license
    ("yüzme",             None),   # swimming
    ("İngilizce",         None),   # language skill, not in digita
    ("takım çalışması",   None),   # teamwork — soft skill, boundary probe

    # E. Hard rejection probes — real tech skills ABSENT from this catalog
    ("Kotlin",            None),   # will Scala/Java pull it above
    ("Docker",            None),
    ("ReactJS",           None),   # watch if "JavaScript Frameworhat'd be right
]

label_to_uris = {}
for label, uri in pairs:
    label_to_uris.setdefault(label, set()).add(uri)

resolved_tests = []

for query_text, gold_labels in test_list:
    if gold_labels is None:
        resolved_tests.append((query_text, None))
    else:
        gold_uris = set()
        for label in gold_labels:
            gold_uris |= label_to_uris[label]
        resolved_tests.append((query_text, gold_uris))
    
test_vectors = embed_list(text_list = [q for q, uri in test_list], input_type = "search_query")

hit_count = 0
miss_count = 0

for (query_text, gold_uris), query_vector in zip(resolved_tests, test_vectors):
    scores = vectors @ query_vector
    ranked = np.argsort(scores)[::-1]
    print(f"{query_text} {pairs[ranked[0]][0]} {scores[ranked[0]]}")

    seen_uris = set()

    for index in ranked:
        pair = pairs[index]
        label = pair[0]
        uri = pair[1]
        score = scores[index]

        if uri in seen_uris:
            continue
        else:
            seen_uris.add(uri)
        
        if len(seen_uris) == 5:
            break

    if gold_uris is None:
        if scores[ranked[0]] < 0.6:
            print("HIT")
            hit_count += 1
        else:
            print("Miss")
            miss_count += 1
    else:
        if pairs[ranked[0]][1] in gold_uris and scores[ranked[0]] >= 0.6:
            print("HIT")
            hit_count += 1
        else:
            print("Miss")
            miss_count += 1

print("----------------------")
print(f"Hit Count: {hit_count}/{len(test_list)}")
print(f"Miss Count: {miss_count}/{len(test_list)}")