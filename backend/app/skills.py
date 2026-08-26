import re

# Skills grouped by category, so each category name is written once instead
# of being repeated as a literal string on every skill that shares it.
# (Previously TERMS and SKILL_CATEGORIES were two separate flat dicts keyed
# by the same skill names, which had to be kept in sync by hand and could
# silently drift, e.g. a new TERMS entry with no matching SKILL_CATEGORIES
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
        "GraphQL": ["graphql", "graph ql"],
        # Bare "rest" is a word in both languages ("rest of the team", "restoran"),
        # so only the compound forms are matched.
        "REST API": ["rest api", "rest apis", "restful", "rest servis", "rest servisleri"],
        "Microservices": ["microservice", "microservices", "mikroservis", "mikroservisler", "mikro servis"],
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
        # Bare "unity" also catches "a culture that values unity", about 3 of 80
        # mentions. Dropping it would cost the far more common "Experience with
        # Unity is a plus", so the false positives are the cheaper side.
        "Unity": ["unity", "unity3d", "unity 3d"],
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
        "Oracle": ["oracle"],
    },
    "data processing": {
        "Kafka": ["kafka"],
        "RabbitMQ": ["rabbitmq", "rabbit mq"],
        "Spark": ["spark"],
        "Pandas": ["pandas"],
        "Power BI": ["power bi", "powerbi"],
    },
    "machine learning": {
        "TensorFlow": ["tensorflow"],
        "PyTorch": ["pytorch"],
        "scikit-learn": ["scikit-learn", "sklearn"],
        "LLM": ["llm", "large language model", "büyük dil modeli"],
        "NLP": ["nlp", "natural language processing", "doğal dil işleme"],
        "Artificial Intelligence": [
            "artificial intelligence", "yapay zeka", "chatgpt", "gemini",
            "prompt engineering", "prompt mühendisliği",
        ],
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
        "CI/CD": ["ci/cd", "cicd", "sürekli entegrasyon", "sürekli teslimat"],
    },
    "version control": {
        "Git": ["git"],
        "GitHub": ["github"],
        "GitLab": ["gitlab"],
    },
    "operating systems": {
        "Linux": ["linux"],
        "Windows": ["windows"],
    },
    "network security": {
        "Firewall": ["firewall", "güvenlik duvarı"],
        "Cybersecurity": ["cyber security", "cybersecurity", "siber güvenlik", "network security", "ağ güvenliği"],
        "Penetration Testing": ["penetration testing", "pentest", "sızma testi"],
    },
    "networking": {
        "Networking": ["network"],
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
        "Playwright": ["playwright"],
    },
    "enterprise resource planning": {
        "SAP": ["sap"],
        "ABAP": ["abap"],
        "Netsis": ["netsis"],
        "Logo": ["logo yazılım", "logo tiger", "logo go3"],
        "ERP": ["erp"],
    },
    "customer relationship management": {
        "CRM": ["crm"],
    },
    "IT support": {
        "Active Directory": ["active directory"],
        "Windows Server": ["windows server"],
        "ITIL": ["itil"],
        "ServiceNow": ["servicenow", "service now"],
        "Zendesk": ["zendesk"],
        "Microsoft 365": ["microsoft 365", "office 365", "m365", "ms office", "microsoft office"],
        "Jira": ["jira"],
        "SCCM": ["sccm"],
    },
    "office productivity": {
        "Excel": ["excel"],
    },
    "project management": {
        "Scrum": ["scrum"],
        "Agile": ["agile", "çevik"],
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

# "excel" is also the English verb ("you excel at...", "excel in this role"),
# which shows up constantly in LinkedIn postings' generic culture-fit
# boilerplate -- 25 of the first 65 LinkedIn matches were that verb, not the
# spreadsheet. Re-anchored to exclude "excel at/in/wherever" specifically,
# since those are the forms that actually occurred; a plain word-boundary
# match can't tell noun from verb.
PATTERNS["Excel"] = re.compile(
    r"(?<![A-Za-z0-9_])excel(?!\s+(?:at|in|wherever)\b)(?![A-Za-z0-9_])",
    re.IGNORECASE,
)

# Same problem, different word: "network" is also corporate-boilerplate
# English ("BCG's global network", "ING Hubs network", "trust Proxify and
# its network") -- 8.8% of matches corpus-wide were that business-network
# sense, not computer networking. Excludes the qualifiers that pattern
# actually showed up with.
PATTERNS["Networking"] = re.compile(
    r"(?<![A-Za-z0-9_])"
    r"(?<!global )(?<!international )(?<!hubs )(?<!partner )"
    r"(?<!professional )(?<!client )(?<!distribution )(?<!wide )"
    r"(?<!sales )(?<!its )(?<!our )(?<!their )(?<!worldwide )"
    r"(?<!corporate )(?<!business )"
    r"network(?![A-Za-z0-9_])",
    re.IGNORECASE,
)

# "Swift" (the Apple language) also collides with SWIFT the international
# bank transfer network -- banking postings list it alongside EFT/FAST
# ("EFT / FAST / SWIFT entegrasyon süreçleri"). Excludes that enumeration
# specifically, since that's the exact form it showed up in.
PATTERNS["Swift"] = re.compile(
    r"(?<![A-Za-z0-9_])"
    r"(?<! / FAST / )(?<!FT, FAST, )"
    r"swift(?![A-Za-z0-9_])",
    re.IGNORECASE,
)

def base_skill_name(label: str) -> str:
    """ESCO qualifies its labels, so "Java (computer programming)" and the keyword
    list's "Java" are the same skill written two ways."""
    return label.split(" (")[0].strip().casefold()


# ESCO labels broad enough to match almost any technical CV, so they say nothing
# about the person and crowd out the skills that do. Only labels we have actually
# watched come back as noise belong here.
SKILL_STOPLIST = {
    "computer technology",
}
