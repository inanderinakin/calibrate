from pathlib import Path

from normalizer.embedding_matcher import build_catalog, load_or_build_vectors, match_candidates
from normalizer.esco_utils import EscoNormalizer
from models import NormalizedSkill

pairs, uri_to_label, uri_to_category = build_catalog()
vectors = load_or_build_vectors(pairs = pairs)
csv_path = Path(Path(__file__).parent/"normalizer"/"esco_dataset"/"catalog.csv")
esco_normalizer = EscoNormalizer(csv_path = csv_path)

def normalize_skills(candidates: list[str]) -> list[NormalizedSkill | None]:
    """
        With this function, we input the skills (or candidates of skills), and the function checks
        if the candidate is an actual skill located in ESCO. If it is, it creates a NormalizedSkill
        object with its name and its ESCO category. If not, it outputs None. Firstly, we directly make
        a string check (name-to-name) if the database has it. If not, we embed them and compare their
        cosine similarity scores by using their vectors
    """
    results: list[str | None] = []
    missing = []

    for index, candidate in enumerate(candidates):
        uri = esco_normalizer.normalize_skill(candidate)
        results.append(uri)
        if uri is None:
            missing.append((index, candidate))
    
    missing_candidates = [candidate for index, candidate in missing]
    match_list = match_candidates(candidates = missing_candidates, pairs = pairs, vectors= vectors)

    for (index, candidate), (query_text, uri, score) in zip(missing, match_list):
        results[index] = uri
    

    normalized_skills = []
    for uri in results:
        if uri is None:
            normalized_skills.append(None)
            continue

        label = uri_to_label[uri]
        category = uri_to_category[uri]

        normalized_skill = NormalizedSkill(skill = label, esco_category = category)
        normalized_skills.append(normalized_skill)
    
    return normalized_skills
    
if __name__ == "__main__":
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
    skills = normalize_skills(candidates = candidates)

    for skill in skills:
        print(skill)