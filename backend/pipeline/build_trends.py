import collections
import json
import math
import re
from pathlib import Path

import jsonlines as jl

trends_path = Path(__file__).parent.parent / "app" / "trends.json"
postings_path = Path(__file__).parent.parent / "scraper" / "postings.jsonl"

baseline_month = "2026-06"
recent_month = "2026-07"
change_threshold = 0.15
directional_floor = 0.075
z_score = 2.0
min_cell_postings = 100
min_term_occurrences = 10

TERMS = {
    "Python": ["python"],
    "Java": ["java"],
    "JavaScript": ["javascript"],
    "TypeScript": ["typescript"],
    "C#": ["c#", "csharp", "c sharp"],
    "C++": ["c++", "cpp"],
    "Golang": ["golang"],
    "Rust": ["rust"],
    "PHP": ["php"],
    "Ruby": ["ruby"],
    "Kotlin": ["kotlin"],
    "Swift": ["swift"],
    "Scala": ["scala"],
    "React": ["react", "reactjs", "react.js"],
    "React Native": ["react native", "react-native"],
    "Angular": ["angular"],
    "Vue": ["vue", "vuejs", "vue.js"],
    "Next.js": ["next.js", "nextjs"],
    ".NET": [".net", "dotnet"],
    "Spring": ["spring boot", "spring"],
    "Django": ["django"],
    "Flask": ["flask"],
    "FastAPI": ["fastapi"],
    "Node.js": ["node.js", "nodejs", "node js"],
    "Laravel": ["laravel"],
    "SQL": ["sql"],
    "PostgreSQL": ["postgresql", "postgres"],
    "MySQL": ["mysql"],
    "MongoDB": ["mongodb", "mongo"],
    "Redis": ["redis"],
    "Elasticsearch": ["elasticsearch", "elastic search"],
    "Kafka": ["kafka"],
    "Spark": ["spark"],
    "TensorFlow": ["tensorflow"],
    "PyTorch": ["pytorch"],
    "scikit-learn": ["scikit-learn", "sklearn"],
    "Pandas": ["pandas"],
    "LLM": ["llm", "large language model"],
    "NLP": ["nlp", "natural language processing"],
    "AWS": ["aws", "amazon web services"],
    "Azure": ["azure"],
    "GCP": ["gcp", "google cloud"],
    "Docker": ["docker"],
    "Kubernetes": ["kubernetes", "k8s"],
    "Terraform": ["terraform"],
    "Jenkins": ["jenkins"],
    "Ansible": ["ansible"],
    "CI/CD": ["ci/cd", "cicd"],
    "Git": ["git"],
    "Linux": ["linux"],
    "Grafana": ["grafana"],
    "Prometheus": ["prometheus"],
    "Android": ["android"],
    "iOS": ["ios"],
    "Flutter": ["flutter"],
    "Selenium": ["selenium"],
    "Cypress": ["cypress"],
    "JUnit": ["junit"],
    "Postman": ["postman"],
}


def build_pattern(aliases):
    parts = []
    for alias in aliases:
        prefix = r"(?<![A-Za-z0-9_])" if alias[0].isalnum() else ""
        suffix = r"(?![A-Za-z0-9_])" if alias[-1].isalnum() else ""
        parts.append(prefix + re.escape(alias) + suffix)
    return re.compile("|".join(parts), re.IGNORECASE)


PATTERNS = {term: build_pattern(aliases) for term, aliases in TERMS.items()}


def posted_month(obj):
    value = str(obj["date_posted"])
    if "-" in value:
        return value[:7]
    day, month, year = value.split(".")
    return f"{year}-{month}"


def count_terms():
    postings_per_cell = collections.Counter()
    term_counts = collections.defaultdict(collections.Counter)

    with jl.open(postings_path) as reader:
        for obj in reader:
            month = posted_month(obj)
            if month not in (baseline_month, recent_month):
                continue

            cell = (obj["source"], month)
            postings_per_cell[cell] += 1
            description = obj.get("description_text") or ""
            for term, pattern in PATTERNS.items():
                if pattern.search(description):
                    term_counts[term][cell] += 1

    return postings_per_cell, term_counts


def measure(old_count, old_total, new_count, new_total):
    old_share = old_count / old_total
    new_share = new_count / new_total
    standard_error = math.sqrt(
        old_share * (1 - old_share) / old_total + new_share * (1 - new_share) / new_total
    )
    change = (new_share - old_share) / old_share
    z = (new_share - old_share) / standard_error if standard_error else 0.0

    if abs(z) >= z_score and abs(change) >= change_threshold:
        label = "Emerging" if change > 0 else "Fading"
    else:
        label = "Stable"

    return {
        "baseline_count": old_count,
        "baseline_total": old_total,
        "baseline_share": round(old_share, 4),
        "recent_count": new_count,
        "recent_total": new_total,
        "recent_share": round(new_share, 4),
        "change": round(change, 4),
        "z": round(z, 2),
        "label": label,
    }


def build_trends():
    postings_per_cell, term_counts = count_terms()
    sources = sorted({
        source for (source, month), total in postings_per_cell.items()
        if total >= min_cell_postings
    })
    usable = [
        source for source in sources
        if postings_per_cell[(source, baseline_month)] >= min_cell_postings
        and postings_per_cell[(source, recent_month)] >= min_cell_postings
    ]

    results = []
    for term in TERMS:
        per_source = {}
        for source in usable:
            old_total = postings_per_cell[(source, baseline_month)]
            new_total = postings_per_cell[(source, recent_month)]
            old_count = term_counts[term][(source, baseline_month)]
            new_count = term_counts[term][(source, recent_month)]
            if old_count < min_term_occurrences or new_count < min_term_occurrences:
                continue
            per_source[source] = measure(old_count, old_total, new_count, new_total)

        if len(per_source) < 2:
            continue

        changes = [entry["change"] for entry in per_source.values()]
        labels = {entry["label"] for entry in per_source.values()}
        mean_change = sum(changes) / len(changes)

        if len(labels) == 1 and labels != {"Stable"}:
            trend, confidence = labels.pop(), "confirmed"
        elif (
            all(change > 0 for change in changes) or all(change < 0 for change in changes)
        ) and abs(mean_change) >= change_threshold and min(abs(change) for change in changes) >= directional_floor:
            trend, confidence = ("Emerging" if mean_change > 0 else "Fading"), "directional"
        else:
            continue

        recent_count = sum(entry["recent_count"] for entry in per_source.values())
        recent_total = sum(entry["recent_total"] for entry in per_source.values())
        results.append({
            "skill": term,
            "trend": trend,
            "confidence": confidence,
            "demand_percentage": round(recent_count / recent_total, 4),
            "change": round(mean_change, 4),
            "sources": per_source,
        })

    results.sort(key=lambda entry: entry["change"], reverse=True)

    output = {
        "baseline_month": baseline_month,
        "recent_month": recent_month,
        "sources": usable,
        "skills": results,
    }

    with open(trends_path, "w", encoding="utf-8") as f:
        f.write(json.dumps(output, ensure_ascii=False))

    counts = collections.Counter((entry["confidence"], entry["trend"]) for entry in results)
    print(f"{len(results)} terms reported from {len(usable)} sources: {dict(counts)}")


if __name__ == "__main__":
    build_trends()
