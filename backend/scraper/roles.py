import re

ROLE_PATTERNS = {
    "DevOps": [
        "devops", "site reliability", "cloud engineer", "bulut mühendisi",
        "platform engineer", "infrastructure engineer", "system administrator",
        "system administration", "sistem yönetici", "network engineer",
        "systems engineer", "sistem uzman", "network uzman", "sistem destek",
        "network destek", "network specialist",
        "network yönetici", "siber güvenlik", "bilgi güvenliği", "cyber security",
        "information security", "network mühendisi", "ağ ve güvenlik",
        "network güvenlik", "ağ güvenliği", "sistem mühendis", "cyber-security",
    ],
    "ML Engineer": [
        "makine öğrenme", "machine learning", "yapay zeka mühendisi", "ai engineer",
        "computer vision", "nlp", "derin öğrenme", "deep learning",
        "ai specialist", "yapay zeka uzmanı", "ml engineer", "ml mühendis",
        "mlops",
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
    # IT Support Specialist and ERP Consultant are intentionally left empty
    # here -- see TITLE_ONLY_PATTERNS below for why.
    "IT Support Specialist": [],
    "ERP Consultant": [],
}

# Job-title phrases that are too generic to trust in description text (e.g.
# "Linux ve sanallaştırma bilgisi tercih sebebidir" is a routine nice-to-have
# line in plenty of unrelated postings, but nobody titles a posting "Sistem
# ve Ağ Uzmanı" unless the job actually is that). Scored against the title
# only, never the description.
#
# Note: only the DevOps-engineering-flavored infra terms are here (cloud
# ops, virtualization, infra engineering). Pure sysadmin/network-technician/
# DBA titles ("network teknisyen", "veritabanı yönetici", "dba", "sistem
# yönetim", "linux sistem"...) were deliberately left out -- that's IT
# operations/support, not a software-engineering discipline this product
# tracks, so those postings stay Unclassified rather than being folded into
# DevOps or given their own role.
#
# IT Support Specialist and ERP Consultant are entirely title-only: words
# like "destek" (support) or "erp" show up constantly as throwaway
# description mentions on completely unrelated software-engineer postings
# ("ERP sistemleriyle entegrasyon deneyimi" as one bullet among many), which
# was flipping generic "Yazılım Uzmanı"/"Senior Java Developer" postings
# into these roles when scored against description text. Nobody titles a
# posting "ERP Uzmanı" or "Yazılım Destek Uzmanı" unless it actually is one.
# IT Support Specialist and ERP Consultant are entirely title-only (see
# above), and title-only phrases that mention IT/ERP but say nothing about
# the actual job function on their own -- "Bilişim Teknolojileri Öğretmeni"
# (IT teacher), "Satış Yöneticisi (Bilişim Teknolojileri...)" (sales manager
# at an IT company), "Muhasebe Uzmanı (Logo ERP Deneyimli)" (accountant who
# uses ERP software) -- get rejected by NON_TECH_CONFLICT_KW below regardless
# of which of these terms matched. One rule for all of them, not a tier of
# "safe" vs "needs a conflict check" terms -- a split like that only holds
# until the next term that turns out to need it too (this list used to split
# "erp"/"bilgi teknoloji" out as special-cased "weak" signals and still let
# "Yazılım Satış Uzmanı" through, because "help desk" etc. were considered
# unconditionally "strong").
TITLE_ONLY_PATTERNS: dict[str, list[str]] = {
    "DevOps": [
        "cybersecurity", "cloud operations", "cloud ops", "bulut sistem",
        "sanallaştırma", "virtualization", "altyapı mühendis",
        # ROLE_PATTERNS covers "systems engineer" and "ağ ve güvenlik" but not
        # the singular / plain-English forms these arrive in.
        "security engineer", "güvenlik mühendis", "system engineer",
        "ağ yönetici", "sre",
    ],
    "Data Scientist": ["data architect", "veri mimar"],
    "IT Support Specialist": [
        "help desk", "helpdesk", "service desk", "technical support",
        "teknik destek", "support engineer", "support specialist",
        "support technician", "it support", "it consultant", "it analyst",
        "field service engineer", "director of information technology",
        "it infrastructure", "it operations", "information technology specialist",
        "it audit", "audit assistant", "bilgi işlem", "bilgi islem",
        "it specialist", "it uzman", "it destek", "it yönetici", "it sorumlu",
        "it manager", "uygulama destek", "destek uzman", "destek eleman",
        "destek asistan", "it saha", "it envanter", "it satınalma",
        "it kontrol", "bilgi teknoloji", "bt uygulama", "bt hizmet",
        "bt kurumsal", "bilişim teknoloji",
    ],
    "ERP Consultant": [
        "erp", "abap", "netsis", "sap consultant", "sap danışman", "sap uzman",
        "sap developer", "sap modül", "sap abap", "sap fico", "sap mm",
        "sap sd", "sap pp", "sap bw", "kurumsal uygulamalar uzman",
        # Module and platform titles the list did not name yet.
        "sap basis", "sap fi", "sap co", "sap yönetici", "sap ana veri",
        "sap s/4", "sap s4", "erp danışman",
    ],
}

# Job-function words that always win over a title-only match above -- same
# principle as relevance.py's NON_CS_TITLE_KW, kept as a separate copy here
# (not imported) because relevance.py already imports map_to_role from this
# module, and importing back would create a circular import.
NON_TECH_CONFLICT_KW = [
    "satış", "satis", "pazarlama", "sales", "marketing",
    "muhasebe", "mali müşavir", "bordro", "ön muhasebe",
    "öğretmen", "ogretmen", "öğretim", "eğitmen", "egitmen", "akademisyen",
    "garson", "aşçı", "otel", "resepsiyon", "barista",
]

DEFAULT_ROLE = "Unclassified"
GENERIC_ROLE = "Software Developer"
KNOWN_ROLES = set(ROLE_PATTERNS) | {GENERIC_ROLE, DEFAULT_ROLE}

GENERIC_PATTERNS = [
    "software engineer", "software develop", "software specialist",
    "yazılım", "bilgisayar mühendis", "computer engineer", "programcı",
    "developer", "geliştirici", "software architect", "yazılım mimar"
]

TITLE_WEIGHT = 10
DESC_WEIGHT = 1
MIN_DESC_EVIDENCE = 2

_COMPILED = {
    role: [re.compile(r"(?<!\w)" + re.escape(p.strip()), re.IGNORECASE) for p in patterns]
    for role, patterns in ROLE_PATTERNS.items()
}

_COMPILED_TITLE_ONLY = {
    role: [re.compile(r"(?<!\w)" + re.escape(p.strip()), re.IGNORECASE) for p in patterns]
    for role, patterns in TITLE_ONLY_PATTERNS.items()
}

_GENERIC = [re.compile(r"(?<!\w)" + re.escape(p), re.IGNORECASE) for p in GENERIC_PATTERNS]

_COMPILED_NON_TECH_CONFLICT = [
    re.compile(r"(?<!\w)" + re.escape(p), re.IGNORECASE) for p in NON_TECH_CONFLICT_KW
]


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
    has_conflict = bool(t) and any(rx.search(t) for rx in _COMPILED_NON_TECH_CONFLICT)

    scores: dict[str, int] = {}
    title_hits: dict[str, int] = {}
    for role in ROLE_PATTERNS:
        ts = _score(t, role) if t else 0
        if not has_conflict:
            ts += sum(1 for rx in _COMPILED_TITLE_ONLY.get(role, ()) if t and rx.search(t))
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


def resolve_role(title: str, description: str | None = None, stored: str | None = None) -> str:
    """Trust the role written at scrape time, except when it is Unclassified.

    "Unclassified" is not a verdict, it is "no pattern matched on the day this
    was scraped". Treating it as final froze 390 postings -- every IT Support
    and ERP title in the corpus -- as unclassifiable long after the patterns
    that recognise them were added. A real role is still trusted as-is so
    reclassifying stays cheap.
    """
    if stored in KNOWN_ROLES and stored != DEFAULT_ROLE:
        return stored
    return map_to_role(title, description)
