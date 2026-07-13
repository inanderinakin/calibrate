"""
yenibiris.com job scraper.

Produces the SAME JSONL schema as kariyer_scraper.py, so the
downstream normalizer/skill-extraction pipeline can treat both sources
identically.

yenibiris.com is fully server-side rendered (classic ASP.NET) with NO bot
challenge and NO AJAX — so unlike kariyer.net this needs neither Playwright nor
a press-and-hold captcha solver. Plain requests + BeautifulSoup is faster,
lighter, and ideal for a 24/7 backend.

  Listing:  https://www.yenibiris.com/is-ilanlari?q={keyword}&sayfa={N}
  Detail:   https://www.yenibiris.com/is-ilani/{slug}/{id}

Output: postings_yenibiris.jsonl (one JSON object per line).
"""
import json
import os
import sys
import time
import random
import re
from urllib.parse import quote

import boto3
import requests
from bs4 import BeautifulSoup

from relevance import is_cs_relevant

# Windows consoles default to a codepage (e.g. cp1254) that can't encode the
# Turkish characters / arrows in our prints — force UTF-8 so it doesn't crash.
sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)

BASE = "https://www.yenibiris.com"

# ── Search sources ────────────────────────────────────────────────────────────
# (label, keyword). main() walks &sayfa=2, &sayfa=3... for each until a page
# returns no new cards. Keywords mirror the CS/IT coverage of the kariyer list.
SOURCES = [
    ("kw:yazılım",             "yazılım"),
    ("kw:yazılım geliştirici", "yazılım geliştirici"),
    ("kw:developer",           "developer"),
    ("kw:software",            "software"),
    ("kw:backend",             "backend"),
    ("kw:frontend",            "frontend"),
    ("kw:full stack",          "full stack"),
    ("kw:devops",              "devops"),
    ("kw:java",                "java"),
    ("kw:python",              "python"),
    ("kw:.net",                ".net"),
    ("kw:javascript",          "javascript"),
    ("kw:react",               "react"),
    ("kw:angular",             "angular"),
    ("kw:node",                "node"),
    ("kw:sql",                 "sql"),
    ("kw:veri tabanı",         "veri tabanı"),
    ("kw:data engineer",       "data engineer"),
    ("kw:veri bilimi",         "veri bilimi"),
    ("kw:yapay zeka",          "yapay zeka"),
    ("kw:machine learning",    "machine learning"),
    ("kw:cloud",               "cloud"),
    ("kw:aws",                 "aws"),
    ("kw:azure",               "azure"),
    ("kw:kubernetes",          "kubernetes"),
    ("kw:linux",               "linux"),
    ("kw:sistem yöneticisi",   "sistem yöneticisi"),
    ("kw:network",             "network"),
    ("kw:siber güvenlik",      "siber güvenlik"),
    ("kw:test uzmanı",         "yazılım test uzmanı"),
    ("kw:mobil",               "mobil uygulama"),
    ("kw:erp uzmanı",          "erp uzmanı"),
    ("kw:sap danışmanı",       "sap danışmanı"),
    ("kw:bilgi teknolojileri", "bilgi teknolojileri"),
    # NOTE: bare short keywords like "it", "sap", "erp", "veri", "qa" were
    # removed — yenibiris does SUBSTRING matching, so "it" matches "eğitim",
    # "sap" matches "hesap", "veri" matches "üniversite"/"çeviri", flooding the
    # results with education/hospitality/sales roles. The is_cs_relevant() gate
    # below is the real safety net, but specific keywords keep noise low.
]

# Write outputs next to THIS script, not the current working directory — so it
# lands in backend/scraper/ no matter where the scraper is launched from.
_HERE = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(_HERE, "postings_yenibiris.jsonl")
FAILED_LOG_FILE = os.path.join(_HERE, "failed_pages_yenibiris.log")
MAX_PAGES_PER_SOURCE = 40

S3_BUCKET = "calibrate-teamthrow"
S3_POSTINGS_KEY = "scraper-data/postings_yenibiris.jsonl"
S3_FAILED_LOG_KEY = "scraper-data/failed_pages_yenibiris.log"


def sync_from_s3():
    """Pull down last run's postings before scraping, so seen_ids reflects
    everything collected so far instead of starting from zero."""
    s3 = boto3.client("s3")
    try:
        s3.download_file(S3_BUCKET, S3_POSTINGS_KEY, OUTPUT_FILE)
        print(f"Downloaded existing postings from s3://{S3_BUCKET}/{S3_POSTINGS_KEY}")
    except Exception as e:
        print(f"No existing postings in S3 (or download failed): {e}")


def sync_to_s3():
    """Upload postings and the failed-page log after a run, then delete the
    local copies — S3 is the source of truth, the local files are just a
    working scratch area for this run (dedup/resume)."""
    s3 = boto3.client("s3")
    if os.path.exists(OUTPUT_FILE):
        try:
            s3.upload_file(OUTPUT_FILE, S3_BUCKET, S3_POSTINGS_KEY)
            print(f"Uploaded postings to s3://{S3_BUCKET}/{S3_POSTINGS_KEY}")
            os.remove(OUTPUT_FILE)
        except Exception as e:
            print(f"Failed to upload postings to S3: {e}")
    if os.path.exists(FAILED_LOG_FILE):
        try:
            s3.upload_file(FAILED_LOG_FILE, S3_BUCKET, S3_FAILED_LOG_KEY)
            os.remove(FAILED_LOG_FILE)
        except Exception as e:
            print(f"Failed to upload failed_pages_yenibiris.log to S3: {e}")

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"),
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def build_page_url(keyword: str, page_num: int) -> str:
    url = f"{BASE}/is-ilanlari?q={quote(keyword)}"
    if page_num > 1:
        url += f"&sayfa={page_num}"
    return url


def log_failed_page(url: str, reason: str):
    with open(FAILED_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')}\t{reason}\t{url}\n")


# ── HTTP with light retry ─────────────────────────────────────────────────────

def fetch(url: str, session: requests.Session, retries: int = 3) -> str | None:
    for attempt in range(1, retries + 1):
        try:
            r = session.get(url, headers=HEADERS, timeout=30)
            if r.status_code == 200 and r.text:
                return r.text
            print(f"  HTTP {r.status_code} for {url} (attempt {attempt})")
        except Exception as e:
            print(f"  Request error for {url} (attempt {attempt}): {e}")
        time.sleep(random.uniform(1.5, 3.0) * attempt)
    log_failed_page(url, "fetch failed after retries")
    return None


# ── Listing scraper: collect posting cards from a search results page ─────────

def collect_cards(keyword: str, page_num: int, session: requests.Session) -> list[dict]:
    url = build_page_url(keyword, page_num)
    print(f"  Loading page {page_num}: {url}")
    html = fetch(url, session)
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    raw_cards = soup.select("div.listViewRows")

    cards_data = []
    seen = set()
    for card in raw_cards:
        link = card.select_one('a.gtmTitle, a[data-test="AdSearch-ad-title-field"]')
        if not link:
            continue
        href = link.get("href", "")
        if not href:
            continue
        if not href.startswith("http"):
            href = BASE + href
        card_id = href.rstrip("/").split("/")[-1]
        if not card_id.isdigit() or card_id in seen:
            continue
        seen.add(card_id)

        company_el  = card.select_one(".gtmCompanyName")
        location_el = card.select_one(".gtmLocation")
        location    = None
        if location_el:
            location = (location_el.get("title") or location_el.get_text(strip=True)) or None
        city = location.split(" - ")[0].strip() if location else None

        cards_data.append({
            "url":           href,
            "id":            card_id,
            "position_name": link.get("title") or link.get_text(strip=True),
            "city":          city,
            "country":       "Türkiye",
            "company_id":    None,
            "sector":        None,       # filled from the detail page
            "work_type":     None,
            "work_model":    None,
            "job_status":    None,
            "_card_company": company_el.get_text(strip=True) if company_el else None,
            "_card_location": location,
        })

    print(f"  → {len(cards_data)} cards on page {page_num}")
    return cards_data


# ── Single posting scraper ────────────────────────────────────────────────────

# Map yenibiris criteria labels → the fields kariyer produced.
def _collect_criteria(soup: BeautifulSoup) -> dict:
    """Return {label: value} for every real criteria row, skipping the consent
    checkbox rows that share the same ul.list-unstyled markup."""
    pairs = {}
    known = {
        "pozisyon", "sektör", "kategori", "çalışma şekli", "çalışma türü",
        "pozisyon seviyesi", "çalışma yeri", "güncelleme tarihi",
        "yayınlanma tarihi", "son başvuru tarihi", "tecrübe", "deneyim",
        "eğitim", "eğitim seviyesi", "askerlik durumu", "departman",
    }
    for li in soup.select("ul.list-unstyled > li"):
        label_el = li.find("label")
        if not label_el:
            continue
        key = label_el.get_text(strip=True)
        if key.lower() not in known:
            continue
        spans = li.find_all("span")
        value = spans[-1].get_text(" ", strip=True) if spans else ""
        value = re.sub(r"\s+", " ", value).strip()
        if value:
            pairs[key] = value
    return pairs


def scrape_posting(url: str, session: requests.Session) -> dict | None:
    html = fetch(url, session)
    if not html:
        return None

    soup = BeautifulSoup(html, "html.parser")

    title_el = soup.select_one("h1.mt0") or soup.find("h1")
    if not title_el:
        log_failed_page(url, "no h1 / not a valid posting page")
        return None

    posting = {}
    posting["id"]  = url.rstrip("/").split("/")[-1]
    posting["url"] = url
    posting["title"] = title_el.get_text(strip=True)

    company_el = soup.select_one("#companyJobsLnk") or soup.select_one(".companyTitle a")
    posting["company"] = company_el.get_text(strip=True) if company_el else None

    location_el = soup.select_one(".locationTxt a.google-location") or soup.select_one(".locationTxt")
    if location_el:
        posting["location"] = (location_el.get("title") or location_el.get_text(strip=True)) or None
    else:
        posting["location"] = None

    crit = _collect_criteria(soup)

    work_type      = crit.get("Çalışma Şekli")
    work_model     = crit.get("Çalışma Türü")
    position_level = crit.get("Pozisyon Seviyesi")
    department     = crit.get("Kategori") or crit.get("Departman")
    sector         = crit.get("Sektör")

    posting["work_type"]        = work_type
    posting["position_level"]   = position_level
    posting["experience_level"] = crit.get("Tecrübe") or crit.get("Deneyim")
    posting["department"]       = department
    posting["application_count"] = None      # not exposed by yenibiris
    posting["work_model"]       = work_model

    # yenibiris exposes an update date and a closing date, but no publish date.
    posting["date_posted"]  = crit.get("Yayınlanma Tarihi") or crit.get("Güncelleme Tarihi")
    posting["closing_date"] = crit.get("Son Başvuru Tarihi")
    posting["is_active"]    = True

    # features: mirror kariyer's short tag list (work model, work type, level, dept)
    features = [v for v in (work_model, work_type, position_level, department) if v]
    posting["features"] = features

    desc = soup.select_one("#adTemplateDiv")
    if desc:
        # drop the lazy-loaded template image so description_text is clean text
        for img in desc.find_all("img"):
            img.decompose()
        posting["description_text"] = desc.get_text(separator="\n", strip=True)
        posting["description_html"] = desc.decode_contents()
    else:
        posting["description_text"] = None
        posting["description_html"] = None

    posting["candidate_criteria"] = {}
    if posting["experience_level"]:
        posting["candidate_criteria"]["experience"] = posting["experience_level"]
    education = crit.get("Eğitim Seviyesi") or crit.get("Eğitim")
    if education:
        posting["candidate_criteria"]["education"] = education

    # card-level metadata fields (mirror kariyer schema)
    posting["city"]       = (posting["location"].split(" - ")[0].strip()
                             if posting["location"] else None)
    posting["country"]    = "Türkiye"
    posting["company_id"] = None
    company_link = soup.select_one(".companyTitle a[href*='/firma/']")
    if company_link:
        m = re.search(r"/(\d+)/?$", company_link.get("href", ""))
        if m:
            posting["company_id"] = m.group(1)
    posting["sector"]     = sector
    posting["job_status"] = None

    return posting


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_seen_ids(output_file: str) -> set:
    seen = set()
    try:
        with open(output_file, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    seen.add(json.loads(line)["id"])
                except Exception:
                    continue
    except FileNotFoundError:
        pass
    return seen


def save_posting(posting: dict):
    with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(posting, ensure_ascii=False) + "\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    sync_from_s3()
    seen_ids = load_seen_ids(OUTPUT_FILE)
    print(f"Already scraped: {len(seen_ids)} postings")

    session = requests.Session()
    total_saved = 0
    total_skipped = 0

    for label, keyword in SOURCES:
        print(f"\n=== Source: '{label}' ===")

        for page_num in range(1, MAX_PAGES_PER_SOURCE + 1):
            cards = collect_cards(keyword, page_num, session)
            if not cards:
                print(f"  No cards on page {page_num} — moving to next source.")
                break

            new_cards = [c for c in cards if c["id"] not in seen_ids]
            print(f"  New (not yet scraped): {len(new_cards)}")

            if not new_cards:
                # Whole page already known — likely deep into old results.
                print("  Page fully seen — moving to next source.")
                break

            for i, card in enumerate(new_cards, 1):
                if card["id"] in seen_ids:
                    continue
                try:
                    posting = scrape_posting(card["url"], session)
                    if posting is None:
                        print(f"  [{i}/{len(new_cards)}] SKIPPED (fetch/parse): {card['url']}")
                        continue
                    # Merge any card-level fields the detail page didn't set.
                    for k, v in card.items():
                        if k.startswith("_"):
                            continue
                        if posting.get(k) in (None, "") and v not in (None, ""):
                            posting[k] = v
                    # Relevance gate: skip non-CS/IT postings entirely.
                    if not is_cs_relevant(posting):
                        seen_ids.add(card["id"])
                        total_skipped += 1
                        print(f"  [{i}/{len(new_cards)}] skipped (not CS): {posting['title']}")
                        continue
                    save_posting(posting)
                    seen_ids.add(card["id"])
                    total_saved += 1
                    print(f"  [{i}/{len(new_cards)}] Saved: {posting['title']} — Total: {total_saved}")
                except Exception as e:
                    print(f"  [{i}/{len(new_cards)}] FAILED {card['url']}: {e}")

                time.sleep(random.uniform(1.0, 2.5))

            time.sleep(random.uniform(1.0, 2.0))

    sync_to_s3()
    print(f"\nDone. Saved {total_saved} CS/IT postings, skipped {total_skipped} irrelevant.")


if __name__ == "__main__":
    main()
