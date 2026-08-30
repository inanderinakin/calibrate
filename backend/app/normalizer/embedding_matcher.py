import json
import time
from pathlib import Path
import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv
import numpy as np
import pandas as pd

load_dotenv()
client = boto3.client(
    "bedrock-runtime",
    config=Config(read_timeout=120, retries={"max_attempts": 6, "mode": "adaptive"}),
)

MAX_ATTEMPTS = 5
BACKOFF_SECONDS = 2
PACE_SECONDS = 0.2

MATCH_THRESHOLD = 0.66

def build_catalog():
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
    
    uri_to_label = {}

    for index, row in catalog_df.iterrows():
        if pd.notna(row['preferredLabel']):
            uri_to_label.setdefault(row['conceptUri'], row['preferredLabel'])
        
    uri_to_category = {}

    for index, row in collection_df.iterrows():
        if pd.notna(row["broaderConceptPT"]):
            concept_list = str(row["broaderConceptPT"]).split("|")
            concept_list = [concept.strip() for concept in concept_list]
            uri_to_category.setdefault(row['conceptUri'], concept_list[0])

    if uri_to_label.keys() != uri_to_category.keys():
        raise ValueError("every concept needs both a label and a category")
    
    return pairs, uri_to_label, uri_to_category

def embed_list(text_list: list[str], input_type: str):
    for attempt in range(MAX_ATTEMPTS):
        try:
            response = client.invoke_model(
                modelId="cohere.embed-multilingual-v3",

                body=json.dumps({"texts": text_list, "input_type": input_type,})
            )
            embeddings = json.loads(response["body"].read())["embeddings"]
            break
        except (BotoCoreError, ClientError) as error:
            if attempt == MAX_ATTEMPTS - 1:
                raise
            wait = BACKOFF_SECONDS * (2 ** attempt)
            print(f"bedrock call failed ({type(error).__name__}), retrying in {wait}s", flush=True)
            time.sleep(wait)

    if len(embeddings) != len(text_list):
        raise RuntimeError(f"expected {len(text_list)} embeddings, got {len(embeddings)}")

    time.sleep(PACE_SECONDS)
    return embeddings

def load_or_build_vectors(pairs, save_path=Path(__file__).parent / "vectors_array.npz"):
    current_labels = np.array([label for label, uri in pairs])
    if save_path.exists():
        cached = np.load(save_path)
        if np.array_equal(cached["labels"], current_labels):
            return cached["vectors"]
    vectors_list = []
    for i in range(0, len(pairs), 96):
        vectors_list.extend(embed_list(
            text_list=[label for label, uri in pairs[i:i+96]],
            input_type="search_document"
        ))
    vectors = np.array(vectors_list)
    np.savez(file=save_path, labels=current_labels, vectors=vectors)
    return vectors

def match_candidates(candidates: list[str], pairs, vectors, threshold=MATCH_THRESHOLD) -> list[str | None]:
    candidates_vectors_list = []
    for i in range(0, len(candidates), 96):
        candidates_vectors_list.extend(embed_list(
            text_list = [candidate for candidate in candidates[i:i+96]], 
            input_type = "search_query",
        ))
    uris_and_scores = []
    for query_text, query_vector in zip(candidates, candidates_vectors_list):
        scores = vectors @ query_vector
        max_score = np.argmax(scores)
        best_uri = pairs[max_score][1] if scores[max_score] >= threshold else None
        uris_and_scores.append((query_text, best_uri, scores[max_score]))
    return uris_and_scores

if __name__ == "__main__":
    pairs, uri_to_label, uri_to_category = build_catalog()

    print(len(pairs))
    print(len(uri_to_label))
    print(len(uri_to_category))

    uri = next(uri for label, uri in pairs if label == "Python (computer programming)")

    print(uri)

    label = uri_to_label[uri]

    print(label)

    category = uri_to_category[uri]

    print(category)

    vectors = load_or_build_vectors(pairs)
    print(vectors.shape)

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
    candidates = [query_text for query_text, gold_labels in test_list]
    results = match_candidates(candidates = candidates, pairs = pairs, vectors = vectors, threshold = 0.65)

    for query, uri, score in results:
        print(f"{query} -> {uri}: {score}")

