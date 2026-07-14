"""
Shared CS/IT relevance gate for all job scrapers (kariyer, yenibiris, secretcv).

Turkish job boards do substring keyword matching, so a search for "it" matches
"eğitim", "sap" matches "hesap", etc. — flooding results with education /
hospitality / sales / construction roles. Every scraper runs each posting
through is_cs_relevant() before saving so only genuine CS/IT postings are kept.

Logic:
  * a clearly non-CS title with no CS signal  → reject
  * a CS keyword in the title                  → accept
  * a CS department, unless the department name itself reads non-tech
    (company-wide sector is deliberately NOT used — see is_cs_relevant)
                                                → accept
  * otherwise                                  → reject
"""
import difflib
import json
import re

CS_SECTORS = (
    "bilgi teknolojileri", "bilişim", "yazılım", "teknoloji",
    "telekomünikasyon", "internet", "bilgisayar",
)

# Department-only signals (never checked against the company-wide sector
# field, which is a different, less reliable field — see is_cs_relevant).
# Short/English forms like "it" only appear here, not in CS_SECTORS, because
# department is a controlled categorical value (safe to substring-match)
# while sector free text could contain "it" inside an unrelated word.
CS_DEPARTMENTS_ONLY = ("it", "information technology")

CS_TITLE_KW = re.compile(
    r"yazılım|software|developer|geliştirici|programcı|programmer|"
    r"devops|dev\s?ops|sre|"
    r"back\s?end|front\s?end|full.?stack|"
    r"data\s?(scientist|engineer|analyst|analytics)|veri\s?(bilim|müh|analist|analiz|taban)|"
    r"iş\s?zekası|business\s?intelligence|"
    r"machine\s?learn|makine\s?öğrenme|yapay\s?zeka|deep\s?learn|ml\s?engineer|"
    r"cloud|bulut|aws|azure|gcp|kubernetes|docker|"
    r"siber|cyber|bilgi\s?güvenli|güvenlik.*bilgi|penetration|"
    r"sistem\s?(müh|yönet|admin|uzman|destek|analist)|systems?\s?(admin|engineer)|"
    r"database|veri\s?taban|dba|"
    r"yazılım\s?test|test\s?(otomasyon|automation)|qa\s?engineer|quality\s?assur|"
    r"\berp\b|sap\s?(abap|basis|danış|konsül|mm|fi|sd|hr|müdür|proje|uzman|yönet)|"
    r"\bit\s?(uzman|yönet|manager|müdür|support|destek|direktör|supervisor|specialist|engineer|mühend|network)|"
    r"bilgi\s?işlem|bilgi\s?teknoloj|information\s?tech|"
    r"scrum|product\s?owner|"
    r"android|ios\s?(developer|geliştir)|mobil\s?(uygulama|geliştir)|mobile\s?dev|"
    r"embedded|gömülü|firmware|"
    r"web\s?(developer|geliştir|tasarım|arayüz|yazılım)|ux\s?/?\s?ui|ui\s?/?\s?ux|"
    r"\bjava\b|\.net|c\+\+|c#|python|php|golang|kotlin|swift|scala|"
    r"react|angular|vue|node\.?js|spring|django|"
    r"linux|unix|"
    r"\bsql\b|nosql|mongodb|postgres|oracle|"
    r"power\s?bi|tableau|etl|"
    r"help\s?desk|teknik\s?destek|technical\s?support|"
    r"network\s?(admin|engineer|uzman|müh|destek|teknisyen|support|specialist|operat)|"
    r"ağ\s?(uzman|müh|güvenlik)|noc\s?(specialist|uzman|operat)|"
    r"system\s?integration|data\s?(services|center)|"
    r"otomasyon\s?müh|rpa|bilgisayar\s?müh|bilgisayar\s?bilim",
    re.IGNORECASE,
)

NON_CS_TITLE_KW = re.compile(
    r"inşaat|mimar(?!.*yazılım)|vinç|forklift|harita|hakediş|"
    r"muhasebe|mali\s?müşavir|bordro|ön\s?muhasebe|finans\s?müdür|sekreter|"
    r"aşçı|garson|barmen|mutfak|restoran|otel|resepsiyon|konaklama|kat\s?şef|meydancı|"
    r"barista|kasap|bulaşıkhane|\bvale|bekçi|"
    r"hemşire|doktor|eczacı|tıbbi|sağlık\s?memur|fizyoterapist|fitness|"
    r"avukat|hukuk\s?müşavir|"
    r"öğretmen|öğretim|akademisyen|okul\s?müdür|danışma.*öğrenci|"
    r"kuaför|berber|güzellik|"
    r"şoför|kurye|nakliye|sürücü|gemici|kaptan|"
    r"çiftlik|tarım|ziraat|"
    r"kasiyer|reyon|mağaza\s?(müdür|satış)|showroom|satış\s?(danışman|temsilci|uzman|müdür|müh|elemanı|yönetici|yönetmeni|yönetim)|"
    r"tele\s?satış|saha\s?satış|tele\s?pazarlama|"
    r"promotör|promosyon|tanıtım\s?(uzman|eleman|personel)|ürün\s?tanıtım|mümessil|"
    r"pazarlama\s?(uzman|eleman|temsilci|sorumlu|yönetici|yetkili)|müşteri\s?temsilci|çağrı\s?merkez|inbound|outbound|"
    r"tekstil|konfeksiyon|terzi|"
    r"makine\s?(müh|kontrol)|elektrik\s?(müh|kontrol|teknisyen|ustası)|üretim\s?(müh|şef|takip|planlama|eleman|operatör)|"
    r"gayrimenkul|emlak|sigorta\s?(danışman|prodüktör)|"
    r"resepsiyonist|hostes|"
    r"güvenlik\s?görevli|"
    r"insan\s?kaynak|işe\s?alım|özlük|"
    r"\bdepo\b|kargo|sevkiyat|antrepo|ambalaj|paketleme|"
    r"bakım\s?onar|arıza\s?bakım|onarım\s?(eleman|teknisyen|sorumlu|uzman)|anakart\s?onar|"
    r"genel\s?başvuru|kariyer\.net.?le|"
    r"kalite\s?(kontrol|güvence|yönetici|sistem)|"
    r"montaj\s?eleman|\boperatör|"
    r"fotoğraf|teknik\s?servis\s?eleman|teknisyenlik|"
    r"satın\s?alma|satınalma|dış\s?ticaret|"
    r"hizmet\s?eleman|genel\s?hizmet|"
    r"e.ticaret\s?uzman|"
    r"üretim\s?destek|operasyon\s?şef|"
    r"pos\s?destek|"
    r"iş\s?sağlığı|i̇sg\s?uzman",
    re.IGNORECASE,
)


def is_cs_relevant(posting: dict) -> bool:
    """True if a scraped posting is a genuine CS/IT role, based on its title,
    department and sector."""
    title = (posting.get("title") or posting.get("position_name") or "").replace("İ", "i").lower()
    dept  = (posting.get("department") or "").replace("İ", "i").lower()

    has_cs         = bool(CS_TITLE_KW.search(title))
    has_non_cs     = bool(NON_CS_TITLE_KW.search(title))
    has_non_cs_dept = bool(NON_CS_TITLE_KW.search(dept))

    # Clear non-CS title with no CS signal → reject.
    if has_non_cs and not has_cs:
        return False
    # CS keyword in the title → accept.
    if has_cs:
        return True
    # CS department → accept (department is job-level and reliable) — unless
    # the department name itself reads as a non-tech function (e.g. company
    # sector is "Bilişim" but department is "Satınalma"/"Teknik Servis").
    #
    # NOTE: sector (company-wide, e.g. "Bilişim") is deliberately NOT used as
    # an accept signal on its own — a company's overall sector tag says
    # nothing about a specific posting's function (its purchasing/service/HR
    # postings get the same sector tag as its engineering ones), and one
    # sector-only accept path is where the whole class of false positives
    # (satın alma, teknik servis, fotoğrafçı, ...) came from.
    cs_signal_in_dept = any(s in dept for s in CS_SECTORS) or any(s in dept for s in CS_DEPARTMENTS_ONLY)
    if cs_signal_in_dept and not has_non_cs_dept:
        return True
    return False


# ── Cross-source duplicate detection ───────────────────────────────────────
# The same real-world posting often gets scraped from more than one site
# (kariyer, secretcv, yenibiris), each with its own id/URL — so id-based dedup
# alone doesn't catch it. Match on normalized (title, company, location) —
# but a company CAN legitimately post the identical title more than once for
# genuinely different roles (different teams, same job title), so a
# title+company+location match alone isn't enough to call it a duplicate.
# We additionally require the description text to actually be similar —
# real cross-site duplicates carry essentially the same description, while
# two distinct postings with a shared title do not.

_PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)
_WS_RE = re.compile(r"\s+")
DESCRIPTION_SIMILARITY_THRESHOLD = 0.75


def _normalize_for_dedup(text: str) -> str:
    t = (text or "").replace("İ", "i").lower()
    t = _PUNCT_RE.sub(" ", t)
    t = _WS_RE.sub(" ", t).strip()
    return t


def posting_dedup_key(posting: dict) -> str:
    """Normalized "title|company|location" key for narrowing down candidate
    matches of the same real-world posting across different sites."""
    title = _normalize_for_dedup(posting.get("title") or posting.get("position_name") or "")
    company = _normalize_for_dedup(posting.get("company") or "")
    location = _normalize_for_dedup(posting.get("location") or posting.get("city") or "")
    return f"{title}|{company}|{location}"


def _description_similarity(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, a, b).ratio()


def load_dedup_index(output_file: str) -> dict:
    """Read every row already saved to the shared postings file (any source)
    and return {dedup_key: [normalized_description, ...]} so a new posting
    can be checked against real candidates for its exact key, not just a
    yes/no set membership."""
    index: dict = {}
    try:
        with open(output_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                key = posting_dedup_key(obj)
                desc = _normalize_for_dedup(obj.get("description_text") or "")
                index.setdefault(key, []).append(desc)
    except FileNotFoundError:
        pass
    return index


def is_duplicate_posting(posting: dict, index: dict) -> bool:
    """True if `posting` matches an already-saved posting on title+company+
    location AND their descriptions are similar enough to be the same real
    listing — not just two different roles that happen to share a title."""
    candidates = index.get(posting_dedup_key(posting))
    if not candidates:
        return False
    desc = _normalize_for_dedup(posting.get("description_text") or "")
    if not desc:
        # No description to compare against — fall back to the key match
        # alone, since there's nothing to rule the candidates out with.
        return True
    return any(_description_similarity(desc, c) >= DESCRIPTION_SIMILARITY_THRESHOLD for c in candidates)


def register_posting(posting: dict, index: dict):
    """Record a newly-saved posting in the in-memory dedup index (call right
    after saving it) so later postings in the same run can be checked
    against it too."""
    key = posting_dedup_key(posting)
    desc = _normalize_for_dedup(posting.get("description_text") or "")
    index.setdefault(key, []).append(desc)
