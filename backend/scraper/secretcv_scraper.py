"""
secretcv.com job scraper.

Produces the SAME JSONL schema as the kariyer.net and yenibiris scrapers, so
the downstream normalizer / skill-extraction pipeline treats every source
identically.

secretcv.com is server-side rendered with NO press-and-hold captcha, so this
uses plain requests + BeautifulSoup (no Playwright).

Two site-specific quirks handled here:
  * Each posting page embeds a schema.org JobPosting JSON-LD block — that is the
    cleanest, most reliable source for title / dates / company / location /
    description, so we read it first and fall back to the DOM only for fields it
    doesn't carry (sector, education level, etc.).
  * Pagination is /is-ilanlari/{slug}-is-ilanlari/?sf={N}. Pages beyond the
    first return HTTP 410 but still contain valid job cards, so we accept 410
    and stop only when a page yields no new postings.

  Listing:  https://www.secretcv.com/is-ilanlari/{slug}-is-ilanlari/?sf={N}
  Detail:   https://www.secretcv.com/{company-slug}/{job-slug}-is-ilanlari-{id}

Output: postings_secretcv.jsonl (one JSON object per line).
"""
import json
import os
import sys
import time
import random
import re

import boto3
import requests
from bs4 import BeautifulSoup

from relevance import is_cs_relevant

# Windows consoles default to a codepage (e.g. cp1254) that can't encode the
# Turkish characters / arrows in our prints — force UTF-8 so it doesn't crash.
sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)

BASE = "https://www.secretcv.com"

# ── Search sources ────────────────────────────────────────────────────────────
# secretcv exposes SEO listing pages at /is-ilanlari/{slug}-is-ilanlari/.
# The "bilgisayar-bt-internet" SECTOR page aggregates all CS/IT jobs and is the
# anchor; the rest are broad CS keyword slugs confirmed to return real results.
# Narrow slugs that 404-to-empty are simply skipped (a page with no cards ends
# that source). Deduplication by posting id handles the overlap between them.
SOURCES = [
    ("sector:bilgisayar-bt-internet", "bilgisayar-bt-internet"),
    ("kw:yazilim",             "yazilim"),
    ("kw:yazilim-uzmani",      "yazilim-uzmani"),
    ("kw:yazilim-muhendisi",   "yazilim-muhendisi"),
    ("kw:veri-tabani",         "veri-tabani"),
    ("kw:sistem-yoneticisi",   "sistem-yoneticisi"),
    ("kw:bilgi-islem",         "bilgi-islem"),
    ("kw:yapay-zeka",          "yapay-zeka"),
    ("kw:siber-guvenlik",      "siber-guvenlik"),
    ("kw:web-tasarim",         "web-tasarim"),
    ("kw:mobil-yazilim",       "mobil-yazilim"),
    ("kw:network",             "network"),
    ("kw:devops",              "devops"),
    ("kw:veri-analisti",       "veri-analisti"),
    ("kw:test-muhendisi",      "test-muhendisi"),
    ("kw:oyun-gelistirme",     "oyun-gelistirme"),
]

# All three scrapers (kariyer, secretcv, yenibiris) now write into the SAME
# postings.jsonl — a "source" field on each posting tells them apart, and
# lets the (still-to-come) cross-source dedup pass match the same real-world
# posting scraped from different sites.
_HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE_NAME = "secretcv"
OUTPUT_FILE = os.path.join(_HERE, "postings.jsonl")
FAILED_LOG_FILE = os.path.join(_HERE, "failed_pages_secretcv.log")
MAX_PAGES_PER_SOURCE = 40

S3_BUCKET = "calibrate-teamthrow"
S3_POSTINGS_KEY = "scraper-data/postings.jsonl"
S3_FAILED_LOG_KEY = "scraper-data/failed_pages_secretcv.log"


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
            print(f"Failed to upload failed_pages_secretcv.log to S3: {e}")

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"),
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

ID_RE = re.compile(r"-is-ilanlari-(\d+)")


def build_page_url(slug: str, page_num: int) -> str:
    url = f"{BASE}/is-ilanlari/{slug}-is-ilanlari/"
    if page_num > 1:
        url += f"?sf={page_num}"
    return url


def log_failed_page(url: str, reason: str):
    with open(FAILED_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')}\t{reason}\t{url}\n")


def _iso_to_ddmmyyyy(value: str | None) -> str | None:
    """Normalize an ISO date (2026-09-10 or 2026-07-01T14:34:19+03:00) to the
    DD.MM.YYYY form the other scrapers emit. Leaves anything unparseable as-is."""
    if not value:
        return None
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", value)
    if m:
        y, mo, d = m.groups()
        return f"{d}.{mo}.{y}"
    return value


# ── HTTP with light retry (accepts 410 pages that still carry cards) ──────────

def fetch(url: str, session: requests.Session, retries: int = 3) -> str | None:
    for attempt in range(1, retries + 1):
        try:
            r = session.get(url, headers={**HEADERS, "Referer": BASE + "/"}, timeout=30)
            # secretcv returns 410 for deep listing pages but still serves valid
            # cards, so accept any 2xx/410 body that has content.
            if r.text and (r.status_code == 200 or r.status_code == 410):
                return r.text
            print(f"  HTTP {r.status_code} for {url} (attempt {attempt})")
        except Exception as e:
            print(f"  Request error for {url} (attempt {attempt}): {e}")
        time.sleep(random.uniform(1.5, 3.0) * attempt)
    log_failed_page(url, "fetch failed after retries")
    return None


# ── Listing scraper: collect posting cards from a search results page ─────────

def collect_cards(slug: str, page_num: int, session: requests.Session) -> list[dict]:
    url = build_page_url(slug, page_num)
    print(f"  Loading page {page_num}: {url}")
    html = fetch(url, session)
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    raw_cards = soup.select("div.cv-job-box")

    cards_data = []
    seen = set()
    for card in raw_cards:
        link = card.select_one("a.title")
        if not link:
            continue
        href = link.get("href", "")
        if not href or "/firma/" in href:
            continue
        if not href.startswith("http"):
            href = BASE + href
        m = ID_RE.search(href)
        if not m:
            continue
        card_id = m.group(1)
        if card_id in seen:
            continue
        seen.add(card_id)

        company_el  = card.select_one("a.company")
        city_el     = card.select_one("span.city")
        city = None
        if city_el:
            # first line only (before the "İlan Tarihi:" small text)
            city = city_el.get_text(" ", strip=True).split("İlan Tarihi")[0].strip() or None

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
        })

    print(f"  → {len(cards_data)} cards on page {page_num}")
    return cards_data


# ── Single posting scraper ────────────────────────────────────────────────────

def _parse_jsonld(soup: BeautifulSoup) -> dict:
    """Return the schema.org JobPosting object, or {} if absent."""
    for sc in soup.find_all("script", type="application/ld+json"):
        raw = sc.string or sc.get_text()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except Exception:
            continue
        candidates = data if isinstance(data, list) else [data]
        for d in candidates:
            if isinstance(d, dict) and d.get("@type") == "JobPosting":
                return d
    return {}


# Only these labels are real per-posting criteria; anything else (and the
# site's giant Sektör/Pozisyon *filter* dropdowns, which reuse div.item markup)
# is ignored.
_KNOWN_CRITERIA = {
    "ilan tarihi", "istihdam türü", "çalışma şekli", "çalışma türü",
    "pozisyon seviyesi", "sektör", "eğitim seviyesi", "eğitim", "departman",
    "tecrübe", "deneyim", "son başvuru tarihi", "şehirler", "şehir",
    "firma adı", "askerlik durumu",
}


def _collect_dom_criteria(soup: BeautifulSoup) -> dict:
    """Read the labeled criteria rows (div.item → span.title / span.desc).

    The page reuses div.item markup for filter dropdowns whose value is a huge
    comma-separated dump of every sector/position on the site. Guard against
    those: only keep whitelisted labels, and reject absurdly long / comma-heavy
    values (a real per-posting field is short)."""
    pairs = {}
    for it in soup.select("div.item"):
        lab = it.select_one("span.title")
        val = it.select_one("span.desc")
        if not (lab and val):
            continue
        key = lab.get_text(strip=True)
        if key.lower() not in _KNOWN_CRITERIA:
            continue
        value = re.sub(r"\s+", " ", val.get_text(" ", strip=True)).strip()
        if not value or len(value) > 250 or value.count(",") > 10:
            continue  # filter-dropdown dump, not a real field
        pairs[key] = value
    return pairs


def _description_block(soup: BeautifulSoup):
    """The job-description container: the .content-job with the most text that
    isn't the (hidden) map container."""
    best, best_len = None, 0
    for el in soup.select(".content-job"):
        classes = " ".join(el.get("class") or [])
        if "map-container" in classes:
            continue
        t = el.get_text(strip=True)
        if len(t) > best_len:
            best_len, best = len(t), el
    return best


def scrape_posting(url: str, session: requests.Session) -> dict | None:
    html = fetch(url, session)
    if not html:
        return None

    soup = BeautifulSoup(html, "html.parser")
    ld = _parse_jsonld(soup)
    crit = _collect_dom_criteria(soup)

    title_el = soup.select_one("h1.title") or soup.find("h1")
    title = ld.get("title") or ld.get("name") or (title_el.get_text(strip=True) if title_el else None)
    if not title:
        log_failed_page(url, "no title / not a valid posting page")
        return None

    posting = {}
    m = ID_RE.search(url)
    posting["id"]  = m.group(1) if m else url.rstrip("/").split("-")[-1]
    posting["url"] = url
    posting["title"] = title

    # company
    company = None
    company_id = None
    org = ld.get("hiringOrganization")
    if isinstance(org, dict):
        company = org.get("name")
        cm = re.search(r"-(\d+)-is-ilanlari", org.get("url", "") or "")
        if cm:
            company_id = cm.group(1)
    if not company:
        company = re.sub(r"\s*İş İlanları$", "", crit.get("Firma Adı", "")).strip() or None
    posting["company"] = company

    # location
    location = None
    loc = ld.get("jobLocation")
    if isinstance(loc, list):
        loc = loc[0] if loc else None
    if isinstance(loc, dict):
        addr = loc.get("address")
        if isinstance(addr, dict):
            location = addr.get("addressLocality") or addr.get("addressRegion")
    if not location:
        location = crit.get("Şehirler") or crit.get("Şehir")
    posting["location"] = location

    work_type      = ld.get("employmentType") or crit.get("İstihdam Türü") or crit.get("Çalışma Şekli")
    work_model     = crit.get("Çalışma Türü") or crit.get("Çalışma Şekli")
    position_level = crit.get("Pozisyon Seviyesi")
    department     = crit.get("Departman")
    sector         = crit.get("Sektör")
    experience     = crit.get("Tecrübe") or crit.get("Deneyim") or ld.get("experienceRequirements")
    education      = crit.get("Eğitim Seviyesi") or crit.get("Eğitim") or ld.get("educationRequirements")

    posting["work_type"]         = work_type
    posting["position_level"]    = position_level
    posting["experience_level"]  = experience if isinstance(experience, str) else None
    posting["department"]        = department
    posting["application_count"] = None      # not exposed by secretcv
    posting["work_model"]        = work_model

    posting["date_posted"]  = _iso_to_ddmmyyyy(ld.get("datePosted")) or crit.get("İlan Tarihi")
    posting["closing_date"] = _iso_to_ddmmyyyy(ld.get("validThrough")) or crit.get("Son Başvuru Tarihi")
    posting["is_active"]    = True

    features = [v for v in (work_model, work_type, position_level, sector, department) if v]
    posting["features"] = features

    # description: prefer the JSON-LD description (clean and reliable). The DOM
    # has several .content-job blocks — incl. a "Benzer İlan Aramaları" (similar
    # searches) block that can be longer than the real one — so only use the DOM
    # as a fallback when JSON-LD carries no description.
    ld_desc = ld.get("description")
    if ld_desc:
        posting["description_html"] = ld_desc
        posting["description_text"] = BeautifulSoup(ld_desc, "html.parser").get_text("\n", strip=True)
    else:
        desc_el = _description_block(soup)
        if desc_el:
            posting["description_text"] = desc_el.get_text(separator="\n", strip=True)
            posting["description_html"] = desc_el.decode_contents()
        else:
            posting["description_text"] = None
            posting["description_html"] = None

    posting["candidate_criteria"] = {}
    if posting["experience_level"]:
        posting["candidate_criteria"]["experience"] = posting["experience_level"]
    if education and isinstance(education, str):
        posting["candidate_criteria"]["education"] = education

    # card-level metadata (mirror kariyer schema)
    posting["city"]       = location.split(",")[0].strip() if location else None
    posting["country"]    = "Türkiye"
    posting["company_id"] = company_id
    posting["sector"]     = sector
    posting["job_status"] = None

    return posting


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_seen_ids(output_file: str) -> set:
    """Load this scraper's already-scraped posting IDs. The file is shared
    across all three scrapers, so only count rows tagged with our own
    source — another source's IDs aren't comparable."""
    seen = set()
    try:
        with open(output_file, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    data = json.loads(line)
                    if data.get("source") == SOURCE_NAME:
                        seen.add(data["id"])
                except Exception:
                    continue
    except FileNotFoundError:
        pass
    return seen


def save_posting(posting: dict):
    posting["source"] = SOURCE_NAME
    posting["scrape_date"] = time.strftime("%Y-%m-%d")
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

    for label, slug in SOURCES:
        print(f"\n=== Source: '{label}' ===")

        for page_num in range(1, MAX_PAGES_PER_SOURCE + 1):
            cards = collect_cards(slug, page_num, session)
            if not cards:
                print(f"  No cards on page {page_num} — moving to next source.")
                break

            new_cards = [c for c in cards if c["id"] not in seen_ids]
            print(f"  New (not yet scraped): {len(new_cards)}")

            if not new_cards:
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
                    if not posting.get("company") and card.get("_card_company"):
                        posting["company"] = card["_card_company"]
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
