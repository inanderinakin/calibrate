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
        "computer vision", " nlp ", "derin öğrenme", "deep learning", " ai ",
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

def map_to_role(title: str, description: str | None = None) -> str:
    def _has(text, *words):
        return any(w in text for w in words)

    t = (title or "").replace("İ", "i").lower()
    for role, patterns in ROLE_PATTERNS.items():
        if _has(t, *patterns):
            return role
        
    if description:
        d = description.replace("İ", "i").lower()
        for role, patterns in ROLE_PATTERNS.items():
            if _has(d, *patterns):
                return role
            
    return "Full Stack or Product Engineer"
