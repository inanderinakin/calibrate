import re

ROLE_PATTERNS = {
    "DevOps": [
        "devops", "site reliability", "cloud engineer", "bulut mühendisi",
        "platform engineer", "infrastructure engineer", "system administrator",
        "system administration", "sistem yönetici", "network engineer",
        "systems engineer", "sistem uzman", "network uzman", "sistem destek",
        "network destek", "siber güvenlik", "bilgi güvenliği", "cyber security",
        "information security", "network mühendisi", "ağ ve güvenlik",
        "network güvenlik", "ağ güvenliği", "sistem mühendis", "cyber-security"
    ],
    "ML Engineer": [
        "makine öğrenme", "machine learning", "yapay zeka mühendisi", "ai engineer",
        "computer vision", "nlp", "derin öğrenme", "deep learning",
        "ai specialist", "yapay zeka uzmanı"
    ],
    "Data Scientist": [
        "veri bilim", "data science", "veri mühendisi", "data engineer",
        "veri analist", "veri analiz", "data analyst", "data analytics",
        "veri analitik", "iş zekası", "business intelligence", "data scientist"
    ],
    "Backend Engineer": ["backend", "back-end", "back end"],
    "Mobile Engineer": [
        "mobil uygulama", "mobile application", "mobile app", "mobil geliştir",
        "mobile developer", "mobile engineer", "android", "ios geliştir",
        "ios developer", "ios engineer", "flutter", "react native",
        "kotlin geliştir", "swift geliştir",
    ],
    "QA Engineer": [
        "test mühendis", "test uzman", "test otomasyon", "test analist",
        "test engineer", "test automation", "test specialist", "yazılım test",
        "quality assurance", "qa", "sdet", "yazılım kalite", "quality engineer"
    ],
    "Full Stack Developer": [
        "full stack", "fullstack", "full-stack",
        "product engineer",
    ],
    "Frontend Engineer": [
        "frontend", "front-end", "front end", "react", "angular", "vue",
        "ux/ui", "ux tasarım", "ui tasarım", "ui/ux",
        "web geliştir", "web tasarım", "web arayüz",
    ],
}

DEFAULT_ROLE = "Unclassified"
GENERIC_ROLE = "Software Developer"

GENERIC_PATTERNS = [
    "software engineer", "software develop", "software specialist",
    "yazılım", "bilgisayar mühendis", "computer engineer", "programcı",
    "developer", "geliştirici"
]

TITLE_WEIGHT = 10
DESC_WEIGHT = 1
MIN_DESC_EVIDENCE = 2

_COMPILED = {
    role: [re.compile(r"(?<!\w)" + re.escape(p.strip()), re.IGNORECASE) for p in patterns]
    for role, patterns in ROLE_PATTERNS.items()
}

_GENERIC = [re.compile(r"(?<!\w)" + re.escape(p), re.IGNORECASE) for p in GENERIC_PATTERNS]


def _normalize(text: str | None) -> str:
    return (text or "").replace("İ", "i").lower()


def _fallback(title: str) -> str:
    if any(rx.search(title) for rx in _GENERIC):
        return GENERIC_ROLE
    return DEFAULT_ROLE


def _score(text: str, role: str) -> int:
    """Number of distinct patterns for `role` present in `text`."""
    return sum(1 for rx in _COMPILED[role] if rx.search(text))


def map_to_role(title: str, description: str | None = None) -> str:
    """Pick the best-supported role rather than the first one that matches.

    The previous implementation returned on the first hit while iterating
    ROLE_PATTERNS, so dict order decided ties -- and DevOps, listed first with
    the broadest pattern list, absorbed anything whose description mentioned
    cloud, system, network or security. Scoring every role and taking the
    strongest removes that ordering dependency entirely.
    """
    t = _normalize(title)
    d = _normalize(description)

    scores: dict[str, int] = {}
    title_hits: dict[str, int] = {}
    for role in ROLE_PATTERNS:
        ts = _score(t, role) if t else 0
        ds = _score(d, role) if d else 0
        title_hits[role] = ts
        scores[role] = ts * TITLE_WEIGHT + ds * DESC_WEIGHT

    if not any(scores.values()):
        return _fallback(t)

    order = list(ROLE_PATTERNS)
    best = max(order, key=lambda r: (scores[r], title_hits[r], -order.index(r)))

    if title_hits[best] == 0 and _score(d, best) < MIN_DESC_EVIDENCE:
        return _fallback(t)

    return best
