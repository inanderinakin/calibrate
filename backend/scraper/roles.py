import re

ROLE_PATTERNS = {
    "DevOps": [
        "devops", "site reliability", "cloud engineer", "bulut mühendisi",
        "platform engineer", "infrastructure engineer", "system administrator",
        "system administration", "sistem yönetici", "network engineer",
        "systems engineer", "sistem uzman", "network uzman", "sistem destek",
        "network destek", "siber güvenlik", "bilgi güvenliği", "cyber security",
        "information security", "network mühendisi", "ağ ve güvenlik",
        "network güvenlik", "ağ güvenliği",
    ],
    "ML Engineer": [
        "makine öğrenme", "machine learning", "yapay zeka mühendisi", "ai engineer",
        "computer vision", "nlp", "derin öğrenme", "deep learning", "ai",
        "ai specialist", "yapay zeka uzmanı",
    ],
    "Data Scientist": [
        "veri bilim", "data science", "veri mühendisi", "data engineer",
        "veri analist", "veri analiz", "data analyst", "data analytics",
        "veri analitik", "iş zekası", "business intelligence",
    ],
    "Backend Engineer": ["backend", "back-end", "back end"],
    "Frontend Engineer": [
        "frontend", "front-end", "front end", "react", "angular", "vue",
        "ux/ui", "ux tasarım", "ui tasarım", "ui/ux",
        "web geliştir", "web tasarım", "web arayüz",
    ],
}

DEFAULT_ROLE = "Full Stack or Product Engineer"

# A title naming the role is near-certain; a description merely mentioning a
# technology is weak evidence. Weighting them equally is what let any posting
# whose description said "cloud" or "network" be filed under DevOps.
TITLE_WEIGHT = 10
DESC_WEIGHT = 1

# Evidence required before the description alone may decide a role. One stray
# mention in a 2500-character posting is not enough; two distinct patterns are.
MIN_DESC_EVIDENCE = 2

# Patterns are matched on a left word boundary only. Several are deliberate
# prefixes ("web geliştir" must catch "web geliştirici"), so a trailing boundary
# would break them, while the leading one still stops mid-word false hits.
_COMPILED = {
    role: [re.compile(r"(?<!\w)" + re.escape(p.strip()), re.IGNORECASE)
           for p in patterns]
    for role, patterns in ROLE_PATTERNS.items()
}


def _normalize(text: str | None) -> str:
    # "İ".lower() yields "i" plus a combining dot, which breaks matching, so
    # fold it explicitly. Dotless "I" is deliberately left alone: mapping it to
    # Turkish "ı" would turn English "AI Engineer" into "aı engineer", and the
    # only reason that still matched was an incidental re.IGNORECASE folding
    # quirk. Patterns are matched case-insensitively, so no fold is needed.
    return (text or "").replace("İ", "i").lower()


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
        return DEFAULT_ROLE

    # Ties break toward the role with more title evidence, then by declaration
    # order -- deterministic, but no longer the primary signal.
    order = list(ROLE_PATTERNS)
    best = max(order, key=lambda r: (scores[r], title_hits[r], -order.index(r)))

    # Nothing in the title matched, so the call rests entirely on description
    # mentions. Demand corroboration before overriding the generic default.
    if title_hits[best] == 0 and _score(d, best) < MIN_DESC_EVIDENCE:
        return DEFAULT_ROLE

    return best
