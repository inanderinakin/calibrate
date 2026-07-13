"""
Shared CS/IT relevance gate for all job scrapers (kariyer, yenibiris, secretcv).

Turkish job boards do substring keyword matching, so a search for "it" matches
"eğitim", "sap" matches "hesap", etc. — flooding results with education /
hospitality / sales / construction roles. Every scraper runs each posting
through is_cs_relevant() before saving so only genuine CS/IT postings are kept.

Logic (mirrors the validated kariyer clean.py):
  * a clearly non-CS title with no CS signal  → reject
  * a CS keyword in the title                  → accept
  * a CS sector or department                  → accept
  * otherwise                                  → reject
"""
import re

CS_SECTORS = (
    "bilgi teknolojileri", "bilişim", "yazılım", "teknoloji",
    "telekomünikasyon", "internet", "bilgisayar",
)

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
    r"network\s?(admin|engineer|uzman|müh|destek)|ağ\s?(uzman|müh|güvenlik)|"
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
    r"montaj\s?eleman|\boperatör",
    re.IGNORECASE,
)


def is_cs_relevant(posting: dict) -> bool:
    """True if a scraped posting is a genuine CS/IT role, based on its title,
    department and sector."""
    title  = (posting.get("title") or posting.get("position_name") or "").replace("İ", "i").lower()
    sector = (posting.get("sector") or "").replace("İ", "i").lower()
    dept   = (posting.get("department") or "").replace("İ", "i").lower()

    has_cs     = bool(CS_TITLE_KW.search(title))
    has_non_cs = bool(NON_CS_TITLE_KW.search(title))

    # Clear non-CS title with no CS signal → reject.
    if has_non_cs and not has_cs:
        return False
    # CS keyword in the title → accept.
    if has_cs:
        return True
    # CS department → accept (department is job-level and reliable).
    if any(s in dept for s in CS_SECTORS):
        return True
    # CS sector → accept, but ONLY when it's a clean single/few-value sector.
    # secretcv lists a company's FULL sector set (a long comma-separated dump),
    # so a promoter/sales role at a company that happens to be tagged "BT" would
    # otherwise leak in. A short sector value is a genuine per-job signal.
    if sector.count(",") <= 2 and any(s in sector for s in CS_SECTORS):
        return True
    return False
