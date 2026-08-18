"""
Collapse the boards' city strings onto Turkish provinces.

The raw field is a mess: 200 distinct values across the corpus, and İstanbul
alone arrives as 'Istanbul', 'İstanbul(Avr.)', 'İstanbul(Asya)', 'Greater
Istanbul', 'İstanbul Anadolu Yakası', plus about thirty district names. Left
alone, the city filter offers 'Atasehir', 'Ataşehir' and 'Beşiktaş' as three
separate places that are all İstanbul.
"""

turkish_folds = str.maketrans({
    "ı": "i", "İ": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g",
    "ü": "u", "Ü": "u", "ö": "o", "Ö": "o", "ç": "c", "Ç": "c", "â": "a", "î": "i",
})

provinces = [
    "Adana", "Adıyaman", "Afyon", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan",
    "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis",
    "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce",
    "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane",
    "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir", "Kahramanmaraş", "Karabük",
    "Karaman", "Kars", "Kastamonu", "Kayseri", "Kırıkkale", "Kırklareli", "Kırşehir", "Kilis",
    "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş",
    "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop",
    "Sivas", "Şanlıurfa", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van",
    "Yalova", "Yozgat", "Zonguldak",
]

districts = {
    "İstanbul": [
        "pendik", "atasehir", "sisli", "umraniye", "kadikoy", "sariyer", "uskudar", "kagithane",
        "maltepe", "esenyurt", "besiktas", "tuzla", "cekmekoy", "kartal", "beyoglu", "sancaktepe",
        "beykoz", "avcilar", "bagcilar", "basaksehir", "kucukcekmece", "beylikduzu", "arnavutkoy",
        "bayrampasa", "bahcelievler", "zeytinburnu", "gaziosmanpasa", "sultangazi", "eyupsultan",
        "bakirkoy", "catalca", "buyukcekmece", "bostanci", "eyup", "silivri", "sile", "adalar",
    ],
    "Ankara": [
        "cankaya", "kecioren", "etimesgut", "sincan", "pursaklar", "mamak", "golbasi",
        "kahramankazan", "yenimahalle", "altindag", "polatli",
    ],
    "İzmir": [
        "bornova", "karsiyaka", "buca", "cigli", "gaziemir", "konak", "bayrakli", "urla",
        "torbali", "menemen", "seferihisar", "kemalpasa", "aliaga",
    ],
    "Kocaeli": ["gebze", "izmit", "korfez", "cayirova", "dilovasi", "kartepe", "derince", "golcuk"],
    "Bursa": ["nilufer", "osmangazi", "yildirim", "inegol", "gemlik"],
    "Tekirdağ": ["corlu", "cerkezkoy", "ergene", "suleymanpasa", "kapakli"],
    "Antalya": ["alanya", "manavgat", "serik", "aksu", "kepez", "muratpasa", "kemer"],
    "Muğla": ["bodrum", "mentese", "fethiye", "marmaris", "milas"],
    "Aydın": ["soke", "kusadasi", "nazilli"],
    "Sakarya": ["akyazi", "adapazari", "serdivan"],
    "Samsun": ["atakum"],
    "Kayseri": ["melikgazi", "kocasinan", "talas"],
    "Isparta": ["yalvac"],
    "Balıkesir": ["edremit", "bandirma", "ayvalik"],
    "Zonguldak": ["karadeniz eregli", "eregli"],
    "Düzce": ["beykoy"],
    "Trabzon": ["arakli", "of"],
    "Diyarbakır": ["dicle"],
    "Mersin": ["gulnar", "tarsus", "mezitli"],
    "Ordu": ["unye", "fatsa"],
    "Konya": ["karatay", "selcuklu", "meram"],
}

nationwide = "Türkiye"
nationwide_forms = {"turkiye", "tum turkiye", "** tum turkiye", "turkey", "remote"}

# Words the boards leave in that carry no location: 'Çorlu Bucağı', 'Aydın Merkez'.
filler = {"bucagi", "merkez", "district", "greater", "yakasi", "anadolu", "avrupa", "avr", "asya"}

_province_by_key = {province.translate(turkish_folds).lower(): province for province in provinces}
_province_by_district = {
    district: province
    for province, names in districts.items()
    for district in names
}


def fold(value):
    return value.translate(turkish_folds).lower().strip()


def normalize_city(value):
    if not value:
        return None

    # 'Adana,Muğla,İstanbul Avrupa Yakası,Ankara,Sivas' — take the first one named.
    first = str(value).split(",")[0]
    text = fold(first).replace("(", " ").replace(")", " ").replace(".", " ")
    text = " ".join(text.split())

    if text in nationwide_forms:
        return nationwide

    if text in _province_by_key:
        return _province_by_key[text]

    if text in _province_by_district:
        return _province_by_district[text]

    words = [word for word in text.split() if word not in filler]

    for word in words:
        if word in _province_by_key:
            return _province_by_key[word]

    for word in words:
        if word in _province_by_district:
            return _province_by_district[word]

    joined = " ".join(words)
    if joined in _province_by_district:
        return _province_by_district[joined]

    return first.strip() or None
