import json
import pandas as pd
from pathlib import Path
import boto3
from dotenv import load_dotenv
import numpy as np

load_dotenv()
client = boto3.client("bedrock-runtime")

THRESHOLD = 0.65

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
    if pd.notna(row['preferredLabel']):
        pairs.append((str(row['preferredLabel']), str(row['conceptUri'])))

    if pd.notna(row['altLabels']):
        split_labels = str(row['altLabels']).split("\n")
        for label in split_labels:
            pairs.append((label, str(row['conceptUri'])))

label_to_uris = {}
for label, uri in pairs:
    label_to_uris.setdefault(label, set()).add(uri)

turkish_labels = [
    ("veri bilimi", "data science"),
    ("makine öğrenimi", "machine learning"),
    ("makine öğrenimini kullanma", "utilise machine learning"),
    ("yapay zeka ilkeleri", "principles of artificial intelligence"),
    ("siber güvenlik", "cyber security"),
    ("bulut güvenliği ve uyumluluğu", "cloud security and compliance"),
    ("veri madenciliği", "data mining"),
    ("veri madenciliği yapma", "perform data mining"),
    ("veri madenciliği yöntemleri", "data mining methods"),
    ("veri görselleştirme yazılımı", "data visualisation software"),
    ("verilerin görsel sunumunu yapma", "deliver visual presentation of data"),
    ("nesnelerin interneti", "Internet of Things"),
    ("işletim sistemleri", "operating systems"),
    ("web programlama", "web programming"),
    ("çevik proje yönetimi", "Agile project management"),
    ("kelime işlemci yazılımı kullanma", "use word processing software"),
    ("arama motoru optimizasyonu", "search engine optimisation"),
    ("arama motoru optimizasyonu yapma", "conduct search engine optimisation"),
    ("ICT şifreleme", "ICT encryption"),
    ("veritabanını yönetme", "manage database"),
    ("veritabanı yönetim sistemleri", "database management systems"),
]

for tr_label, en_label in turkish_labels:
    for uri in label_to_uris[en_label]:
        pairs.append((tr_label, uri))

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
    ("Python", ["Python (computer programming)"]),
    ("Java", ["Java (computer programming)"]),
    ("JavaScript", ["JavaScript"]),
    ("TypeScript", ["TypeScript"]),
    ("C#", ["C#"]),
    ("machine learning", ["machine learning", "utilise machine learning"]),
    ("cyber security", ["cyber security"]),
    ("business intelligence", ["business intelligence"]),
    ("SQL", ["SQL"]),
    ("data science", ["data science"]),
    ("JS", ["JavaScript"]),
    ("MSSQL", ["MS SQL Server"]),
    ("PostgreSQL", ["Postgres"]),
    ("Veri Bilimi", ["data science"]),
    ("Makine Öğrenmesi", ["machine learning", "utilise machine learning"]),
    ("Yapay Zeka", ["principles of artificial intelligence"]),
    ("Siber Güvenlik", ["cyber security"]),
    ("Bulut Güvenliği", ["cloud security and compliance"]),
    ("Veri Madenciliği", ["data mining", "perform data mining", "data mining methods"]),
    ("Veri Görselleştirme", ["data visualisation software", "deliver visual presentation of data"]),
    ("Nesnelerin İnterneti", ["Internet of Things"]),
    ("İşletim Sistemleri", ["operating systems"]),
    ("Web Programlama", ["web programming"]),
    ("Çevik Proje Yönetimi", ["Agile project management"]),
    ("Kelime İşlemci", ["use word processing software"]),
    ("Arama Motoru Optimizasyonu", ["search engine optimisation", "conduct search engine optimisation"]),
    ("Şifreleme", ["ICT encryption"]),
    ("Veritabanı Yönetimi", ["manage database", "database management systems"]),
    ("satranç", None),
    ("ehliyet", None),
    ("yüzme", None),
    ("İngilizce", None),
    ("takım çalışması", None),
    ("Kotlin", None),
    ("Docker", None),
    ("ReactJS", None),
]

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
miss_list = []

for (query_text, gold_uris), query_vector in zip(resolved_tests, test_vectors):
    scores = vectors @ query_vector
    ranked = np.argsort(scores)[::-1]
    top_label, top_uri = pairs[ranked[0]]
    top_score = scores[ranked[0]]
    print(f"{query_text} {top_label} {top_score}")
    print(ranked[:5])

    if gold_uris is None:
        if top_score < THRESHOLD:
            print("HIT")
            hit_count += 1
        else:
            print("Miss")
            miss_count += 1
            miss_list.append((query_text, top_label, top_score))
    else:
        if top_uri in gold_uris and top_score >= THRESHOLD:
            print("HIT")
            hit_count += 1
        else:
            print("Miss")
            miss_count += 1
            miss_list.append((query_text, top_label, top_score))

print("----------------------")
print(f"Hit Count: {hit_count}/{len(test_list)}")
print(f"Miss Count: {miss_count}/{len(test_list)}")

for query_text, top_label, top_score in miss_list:
    print(f"  {query_text} -> {top_label} ({top_score:.4f})")