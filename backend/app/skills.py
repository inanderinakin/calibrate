import re

# Skills grouped by category, so each category name is written once instead
# of being repeated as a literal string on every skill that shares it.
# (Previously TERMS and SKILL_CATEGORIES were two separate flat dicts keyed
# by the same skill names, which had to be kept in sync by hand and could
# silently drift — e.g. a new TERMS entry with no matching SKILL_CATEGORIES
# entry would KeyError at request time in main.py.)
CATEGORIES = {
    "computer programming": {
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
    },
    "software and applications development and analysis": {
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
        "Android": ["android"],
        "iOS": ["ios"],
        "Flutter": ["flutter"],
    },
    "query languages": {
        "SQL": ["sql"],
    },
    "database management systems": {
        "PostgreSQL": ["postgresql", "postgres"],
        "MySQL": ["mysql"],
        "MongoDB": ["mongodb", "mongo"],
        "Redis": ["redis"],
        "Elasticsearch": ["elasticsearch", "elastic search"],
    },
    "data processing": {
        "Kafka": ["kafka"],
        "Spark": ["spark"],
        "Pandas": ["pandas"],
    },
    "machine learning": {
        "TensorFlow": ["tensorflow"],
        "PyTorch": ["pytorch"],
        "scikit-learn": ["scikit-learn", "sklearn"],
        "LLM": ["llm", "large language model"],
        "NLP": ["nlp", "natural language processing"],
    },
    "cloud services": {
        "AWS": ["aws", "amazon web services"],
        "Azure": ["azure"],
        "GCP": ["gcp", "google cloud"],
    },
    "containerization": {
        "Docker": ["docker"],
        "Kubernetes": ["kubernetes", "k8s"],
    },
    "infrastructure automation": {
        "Terraform": ["terraform"],
        "Ansible": ["ansible"],
    },
    "continuous integration": {
        "Jenkins": ["jenkins"],
        "CI/CD": ["ci/cd", "cicd"],
    },
    "version control": {
        "Git": ["git"],
    },
    "operating systems": {
        "Linux": ["linux"],
    },
    "monitoring": {
        "Grafana": ["grafana"],
        "Prometheus": ["prometheus"],
    },
    "software testing": {
        "Selenium": ["selenium"],
        "Cypress": ["cypress"],
        "JUnit": ["junit"],
        "Postman": ["postman"],
    },
}


def build_pattern(aliases):
    parts = []
    for alias in aliases:
        prefix = r"(?<![A-Za-z0-9_])" if alias[0].isalnum() else ""
        suffix = r"(?![A-Za-z0-9_])" if alias[-1].isalnum() else ""
        parts.append(prefix + re.escape(alias) + suffix)
    return re.compile("|".join(parts), re.IGNORECASE)


PATTERNS = {}
SKILL_CATEGORIES = {}
for category, skills in CATEGORIES.items():
    for term, aliases in skills.items():
        PATTERNS[term] = build_pattern(aliases)
        SKILL_CATEGORIES[term] = category