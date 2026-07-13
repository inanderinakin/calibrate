"""
kariyer.net job scraper.

The original, most involved scraper of the three: kariyer.net is a JS-heavy SPA
behind a PerimeterX press-and-hold bot challenge, so this uses Playwright (not
plain requests) and solves the challenge, then syncs its raw feed to S3 for the
deployed 24/7 run.

Outputs (in backend/scraper/):
  * postings_kariyer_raw.jsonl  — everything scraped, unfiltered
  * postings_kariyer.jsonl      — the curated CS/IT set used by the pipeline

Sibling scrapers with the identical output schema: yenibiris_scraper.py,
secretcv_scraper.py (both plain requests + the shared relevance.py gate).
"""
import json
import os
import re
import sys
import time
import random
from urllib.parse import quote
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import boto3

from relevance import is_cs_relevant

# Windows consoles default to a codepage (e.g. cp1254) that can't encode
# the arrow/emoji characters used in our print statements — force UTF-8
# so this doesn't crash on non-UTF-8 terminals or when output is redirected.
sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)

# ── Search sources ────────────────────────────────────────────────────────────
# Each entry is (label, base_url). main() walks &page=2, &page=3... for each
# source (see build_page_url) until a page returns no new cards.
# Category URLs cover the bulk; keyword URLs supplement for specific roles.
SOURCES = [
    # Category browsing — primary sources
    ("kategori:BT+Bilişim",   "https://www.kariyer.net/is-ilanlari?cs=001000000,010100000"),

    # Keyword supplements — broad terms
    ("kw:yazılım",            "https://www.kariyer.net/is-ilanlari?kw=yaz%C4%B1l%C4%B1m"),
    ("kw:developer",          "https://www.kariyer.net/is-ilanlari?kw=developer"),
    ("kw:devops",             "https://www.kariyer.net/is-ilanlari?kw=devops"),
    ("kw:backend",            "https://www.kariyer.net/is-ilanlari?kw=backend"),
    ("kw:frontend",           "https://www.kariyer.net/is-ilanlari?kw=frontend"),
    ("kw:angular",            "https://www.kariyer.net/is-ilanlari?kw=angular"),
    ("kw:yapay-zeka",         "https://www.kariyer.net/is-ilanlari?kw=yapay%20zeka"),
    ("kw:siber",              "https://www.kariyer.net/is-ilanlari?kw=siber"),
    ("kw:veri",               "https://www.kariyer.net/is-ilanlari?kw=veri"),

    # Additional keywords for more coverage
    ("kw:yazılım geliştirici", "https://www.kariyer.net/is-ilanlari?kw=yaz%C4%B1l%C4%B1m%20geli%C5%9Ftirici"),
    ("kw:software",           "https://www.kariyer.net/is-ilanlari?kw=software"),
    ("kw:java",               "https://www.kariyer.net/is-ilanlari?kw=java"),
    ("kw:python",             "https://www.kariyer.net/is-ilanlari?kw=python"),
    ("kw:.net",               "https://www.kariyer.net/is-ilanlari?kw=.net"),
    ("kw:sql",                "https://www.kariyer.net/is-ilanlari?kw=sql"),
    ("kw:cloud",              "https://www.kariyer.net/is-ilanlari?kw=cloud"),
    ("kw:kubernetes",         "https://www.kariyer.net/is-ilanlari?kw=kubernetes"),
    ("kw:data engineer",      "https://www.kariyer.net/is-ilanlari?kw=data%20engineer"),
    ("kw:full stack",         "https://www.kariyer.net/is-ilanlari?kw=full%20stack"),
    ("kw:sistem yöneticisi",  "https://www.kariyer.net/is-ilanlari?kw=sistem%20y%C3%B6neticisi"),
    ("kw:bilgi teknolojileri", "https://www.kariyer.net/is-ilanlari?kw=bilgi%20teknolojileri"),
    ("kw:IT",                 "https://www.kariyer.net/is-ilanlari?kw=IT"),
    ("kw:test engineer",      "https://www.kariyer.net/is-ilanlari?kw=test%20engineer"),
    ("kw:QA",                 "https://www.kariyer.net/is-ilanlari?kw=QA"),
    ("kw:react",              "https://www.kariyer.net/is-ilanlari?kw=react"),
    ("kw:node",               "https://www.kariyer.net/is-ilanlari?kw=node"),
    ("kw:AWS",                "https://www.kariyer.net/is-ilanlari?kw=AWS"),
    ("kw:azure",              "https://www.kariyer.net/is-ilanlari?kw=azure"),
    ("kw:ERP",                "https://www.kariyer.net/is-ilanlari?kw=ERP"),
    ("kw:SAP",                "https://www.kariyer.net/is-ilanlari?kw=SAP"),
    ("kw:network",            "https://www.kariyer.net/is-ilanlari?kw=network"),
    ("kw:linux",              "https://www.kariyer.net/is-ilanlari?kw=linux"),
    ("kw:mobil uygulama",     "https://www.kariyer.net/is-ilanlari?kw=mobil%20uygulama"),
    ("kw:veri tabanı",        "https://www.kariyer.net/is-ilanlari?kw=veri%20taban%C4%B1"),
    ("kw:machine learning",   "https://www.kariyer.net/is-ilanlari?kw=machine%20learning"),
]

# Write outputs next to THIS script, not the current working directory, so they
# always land in backend/scraper/ regardless of where the scraper is launched.
# This is the RAW kariyer feed (unfiltered); the curated CS/IT set lives in
# postings_kariyer.jsonl.
_HERE = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(_HERE, "postings_kariyer_raw.jsonl")
CURATED_OUTPUT_FILE = os.path.join(_HERE, "postings_kariyer.jsonl")
FAILED_LOG_FILE = os.path.join(_HERE, "failed_pages_kariyer.log")
MAX_PAGES_PER_SOURCE = 50

# Sub-classifies a posting that already passed the shared is_cs_relevant()
# gate into one of the 6 target roles — relevance.py only answers "CS or
# not", it doesn't say which kind. Kept local to this scraper for now since
# it's the only one anything downstream (T1.1 role breakdown) needs yet.
ROLE_PATTERNS = {
    "DevOps": [
        "devops", "site reliability", "cloud engineer", "bulut mühend",
        "platform engineer", "infrastructure engineer", "system administrator",
        "system administration", "sistem yönetici", "network engineer",
        "systems engineer", "sistem uzman", "network uzman", "sistem destek",
        "network destek", "siber güvenlik", "bilgi güvenliği", "cyber security",
        "information security", "network mühend", "ağ ve güvenlik",
        "network güvenlik", "ağ güvenliği",
    ],
    "ML Engineer": [
        "makine öğrenme", "machine learning", "yapay zeka mühend", "ai engineer",
        "computer vision", " nlp ", "derin öğrenme", "deep learning", " ai ",
        "ai specialist", "yapay zeka uzman",
    ],
    "Data Scientist": [
        "veri bilim", "data scien", "veri mühend", "data engineer",
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
    """Sub-classify an already-CS-relevant posting into one of the 5
    specific roles, or "Full Stack or Product Engineer" as the catch-all
    when nothing more specific matches the title. Also checks the
    description, since Turkish postings very often title everything
    "Yazılım Geliştirici" and only name the actual stack (React,
    Kubernetes, ML...) in the body."""
    def _has(text, *words):
        return any(w in text for w in words)

    # Plain ASCII "I" is left alone (titles use it for English acronyms
    # like "UI"/"IT"/"AI"); only Turkish capital İ needs the fix, since
    # Python's default .lower() otherwise mangles it into "i" + a
    # combining dot instead of plain "i".
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

# NOTE: the raw feed's S3 key is left unchanged so the deployed 24/7 scraper
# keeps syncing to the same remote object it always has (renaming it would
# orphan the existing S3 data and reset incremental dedup). The curated set
# gets its own key alongside it.
S3_BUCKET = "calibrate-teamthrow"
S3_POSTINGS_KEY = "scraper-data/postings.jsonl"
S3_CURATED_POSTINGS_KEY = "scraper-data/postings_kariyer_curated.jsonl"
S3_FAILED_LOG_KEY = "scraper-data/failed_pages.log"


def sync_from_s3():
    """Pull down last run's postings (raw + curated) before scraping, so
    seen_ids reflects everything collected so far instead of starting from
    zero, and the curated set keeps accumulating rather than resetting."""
    s3 = boto3.client("s3")
    try:
        s3.download_file(S3_BUCKET, S3_POSTINGS_KEY, OUTPUT_FILE)
        print(f"Downloaded existing postings from s3://{S3_BUCKET}/{S3_POSTINGS_KEY}")
    except Exception as e:
        print(f"No existing postings in S3 (or download failed): {e}")
    try:
        s3.download_file(S3_BUCKET, S3_CURATED_POSTINGS_KEY, CURATED_OUTPUT_FILE)
        print(f"Downloaded existing curated postings from s3://{S3_BUCKET}/{S3_CURATED_POSTINGS_KEY}")
    except Exception as e:
        print(f"No existing curated postings in S3 (or download failed): {e}")


def sync_to_s3():
    """Upload raw postings, curated postings, and the failed-page log after a
    run, then delete the local copies — S3 is the source of truth, the local
    files are just a working scratch area for this run (dedup/resume) and
    shouldn't linger in the repo folder afterward."""
    s3 = boto3.client("s3")
    try:
        s3.upload_file(OUTPUT_FILE, S3_BUCKET, S3_POSTINGS_KEY)
        print(f"Uploaded postings to s3://{S3_BUCKET}/{S3_POSTINGS_KEY}")
        os.remove(OUTPUT_FILE)
    except Exception as e:
        print(f"Failed to upload postings to S3: {e}")
    if os.path.exists(CURATED_OUTPUT_FILE):
        try:
            s3.upload_file(CURATED_OUTPUT_FILE, S3_BUCKET, S3_CURATED_POSTINGS_KEY)
            print(f"Uploaded curated postings to s3://{S3_BUCKET}/{S3_CURATED_POSTINGS_KEY}")
            os.remove(CURATED_OUTPUT_FILE)
        except Exception as e:
            print(f"Failed to upload curated postings to S3: {e}")
    if os.path.exists(FAILED_LOG_FILE):
        try:
            s3.upload_file(FAILED_LOG_FILE, S3_BUCKET, S3_FAILED_LOG_KEY)
            os.remove(FAILED_LOG_FILE)
        except Exception as e:
            print(f"Failed to upload failed_pages.log to S3: {e}")


def build_page_url(base_url: str, page_num: int) -> str:
    """Append &page=N (or ?page=N if base_url has no query yet) to a search URL."""
    if page_num <= 1:
        return base_url
    sep = "&" if "?" in base_url else "?"
    return f"{base_url}{sep}page={page_num}"


def log_failed_page(url: str, reason: str):
    """Record a page we couldn't load so it can be manually retried later —
    a page returning 0 cards might be a real end-of-results, or it might be
    a captcha we failed to solve. We can't always tell the two apart, so we
    log every empty page rather than risk silently dropping real postings."""
    with open(FAILED_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')}\t{reason}\t{url}\n")


def wait_for_selector_with_challenge(page, selector: str, url: str, timeout: int = 20000) -> bool:
    """Wait for `selector`, handling the PerimeterX press-and-hold challenge if
    it shows up (it can appear on listing pages AND individual posting pages).
    Returns True once the selector appears. On failure, logs `url` to
    FAILED_LOG_FILE so it can be retried later instead of silently dropped."""
    try:
        page.wait_for_selector(selector, timeout=timeout)
        return True
    except Exception:
        pass

    if _handle_press_and_hold(page):
        print("  Bot challenge solved, waiting for content...")
        try:
            page.wait_for_selector(selector, timeout=timeout)
            return True
        except Exception:
            pass
    else:
        print("  No known challenge detected — might be a different captcha type.")

    # Unattended run — no human to solve a second/unknown challenge. Give the
    # page a bit longer in case it's still settling, then give up.
    print(f"  ⚠ '{selector}' still not found. Waiting 30s, then giving up on this page.")
    time.sleep(30)
    try:
        page.wait_for_selector(selector, timeout=10000)
        return True
    except Exception:
        print("  Still not found, moving on.")
        log_failed_page(url, f"selector '{selector}' never appeared (captcha or blocked)")
        return False


def _read_progress_bar_width(cdp) -> float | None:
    """Read the press-and-hold progress bar's fill width (0 -> 253px) via
    CDP, piercing the closed shadow root + iframe the button lives in —
    Playwright's normal locator/evaluate APIs can't reach closed shadow
    content, but CDP's DOM domain can (same as DevTools' Elements panel).

    The bar div isn't a fixed child index (nesting shifts between builds),
    so we scan every descendant of the role="button" node for the first
    one carrying an inline `width:Npx` style, wherever it sits."""
    try:
        doc = cdp.send("DOM.getDocument", {"pierce": True, "depth": -1})
    except Exception:
        return None

    def attrs_to_dict(node):
        flat = node.get("attributes") or []
        return dict(zip(flat[0::2], flat[1::2]))

    def find_width_style(node):
        attrs = attrs_to_dict(node)
        style = attrs.get("style", "")
        m = re.search(r"width:\s*([\d.]+)px", style)
        if m:
            return float(m.group(1))
        for child in node.get("children") or []:
            result = find_width_style(child)
            if result is not None:
                return result
        return None

    def walk(node):
        attrs = attrs_to_dict(node)
        if attrs.get("role") == "button":
            result = find_width_style(node)
            if result is not None:
                return result
        for key in ("children", "shadowRoots", "contentDocument"):
            val = node.get(key)
            if isinstance(val, list):
                for child in val:
                    result = walk(child)
                    if result is not None:
                        return result
            elif isinstance(val, dict):
                result = walk(val)
                if result is not None:
                    return result
        return None

    return walk(doc.get("root", {}))


# ── Listing scraper: collects posting URLs from search results ────────────────

def _handle_press_and_hold(page, max_attempts: int = 3) -> bool:
    """Detect and solve the kariyer.net (PerimeterX) press-and-hold bot
    challenge. Returns True once a press-and-hold is verifiably accepted,
    False if no challenge appeared at all or every attempt was rejected.

    The real button lives inside a CLOSED shadow root, inside an iframe,
    inside div#px-captcha: div#px-captcha > #shadow-root (closed) > iframe
    > (button). Closed shadow roots can't be queried by Playwright or any
    external JS, so we can't select the button directly. Instead we click
    the center of the shadow HOST (div#px-captcha) itself — shadow DOM
    blocks querying, not layout, so the button always renders within it.

    A single press can be rejected ("Lütfen tekrar deneyin") — retry a few
    times before giving up rather than failing the whole page on one miss."""
    try:
        container = page.locator("div#px-captcha").first
        container.wait_for(timeout=3000)
    except Exception:
        return False  # No challenge on this page

    print("  Bot challenge detected — attempting press and hold...")
    page.wait_for_timeout(2000)  # let the shadow-rendered button settle in

    for attempt in range(1, max_attempts + 1):
        if attempt > 1:
            print(f"  Retrying press and hold (attempt {attempt}/{max_attempts})...")
        if _attempt_press_and_hold_once(page, container):
            return True
        try:
            container.wait_for(timeout=1000)  # still on the challenge?
        except Exception:
            return False  # challenge gone but we didn't detect it as solved — treat as done
    return False


def _attempt_press_and_hold_once(page, container) -> bool:
    """One press-and-hold attempt. Returns True only if the challenge box
    verifiably disappeared afterward — a rejected press ("Lütfen tekrar
    deneyin") doesn't raise, so we can't just trust the absence of errors."""
    try:
        box = container.bounding_box()
        if not box:
            return False
        # The container is taller than the button itself (extra room below
        # is reserved for a "Lütfen tekrar deneyin" retry message), and the
        # button sits at the top, not centered — so target that, not the
        # container's vertical center.
        cx = box["x"] + box["width"] / 2
        cy = box["y"] + 26

        # Approach in a few steps rather than jumping straight to target.
        # Jittering *while held down* risks drifting off the button and
        # cancelling the press, so keep it still once pressed.
        start_x, start_y = cx - random.uniform(30, 60), cy - random.uniform(20, 40)
        page.mouse.move(start_x, start_y)
        steps = random.randint(4, 7)
        for i in range(1, steps + 1):
            page.mouse.move(
                start_x + (cx - start_x) * i / steps + random.uniform(-2, 2),
                start_y + (cy - start_y) * i / steps + random.uniform(-2, 2),
            )
            time.sleep(random.uniform(0.02, 0.06))

        # Snapping exactly onto the pixel center and then pressing looks
        # just as robotic as not moving at all — start the same small
        # jitter (more horizontal than vertical, like a real hand) a
        # moment *before* pressing, and keep it going uninterrupted through
        # the down event and the hold, instead of a jitter-free press.
        def _jitter():
            page.mouse.move(cx + random.uniform(-1.2, 1.2), cy + random.uniform(-0.4, 0.4))

        _jitter()
        for _ in range(random.randint(2, 4)):
            time.sleep(random.uniform(0.08, 0.15))
            _jitter()

        page.mouse.down()
        # The fill bar's width goes from 0 to a fixed 253px — poll the real
        # value via CDP and release right when it's full, instead of
        # guessing a duration or waiting for a redirect.
        cdp = page.context.new_cdp_session(page)
        cdp.send("DOM.enable")
        held = 0.0
        max_hold = 20.0  # observed fill time varies (~5.7s-7.8s across runs)
        while held < max_hold:
            step = 0.15
            time.sleep(step)
            held += step
            _jitter()
            width = _read_progress_bar_width(cdp)
            # Releasing before the bar is actually full reads as an
            # incomplete/cancelled press and gets rejected — wait for it to
            # be (essentially) done, not just close.
            if width is not None and width >= 252:
                break
        time.sleep(random.uniform(0.2, 0.4))  # the "three dots" beat before release
        page.mouse.up()
        time.sleep(2)  # Wait for redirect

        # The press can be rejected ("Lütfen tekrar deneyin") without ever
        # raising — verify the challenge box actually went away instead of
        # assuming success just because we didn't hit an exception.
        try:
            page.locator("div#px-captcha").first.wait_for(state="hidden", timeout=3000)
            print("  Press and hold completed — challenge cleared.")
            return True
        except Exception:
            print("  Press and hold was rejected (challenge still showing).")
            return False
    except Exception as e:
        print(f"  Challenge attempt failed: {e}")
        return False


def collect_cards(base_url: str, page: "playwright Page") -> list[dict]:
    """Scrape all job cards from a single listing page.
    kariyer.net renders all results server-side in one page (no AJAX pagination).
    We scroll down gradually to ensure any lazy-loaded cards appear.
    """
    print(f"  Loading: {base_url}")
    page.goto(base_url, timeout=60000)

    if not wait_for_selector_with_challenge(page, '[data-test="ad-card"]', base_url):
        return []

    # Scroll down gradually to trigger any lazy-loaded content
    prev_count = 0
    for scroll_step in range(20):
        page.evaluate("window.scrollBy(0, 800)")
        time.sleep(0.5)
        current_count = page.locator('[data-test="ad-card"]').count()
        if current_count > prev_count:
            prev_count = current_count
    print(f"  Page fully scrolled. Found {prev_count} card elements.")

    # Extract all cards
    html = page.content()
    soup = BeautifulSoup(html, "html.parser")
    raw_cards = soup.find_all(attrs={"data-test": "ad-card"})

    cards_data = []
    seen_ids = set()
    for card in raw_cards:
        link = card.find(attrs={"data-test": "ad-card-item"})
        if not link:
            continue
        href = link.get("href", "")
        if not href.startswith("http"):
            href = "https://www.kariyer.net" + href
        card_id = href.split("-")[-1]
        if card_id in seen_ids:
            continue
        seen_ids.add(card_id)
        cards_data.append({
            "url":           href,
            "id":            card_id,
            "position_name": card.get("positionname"),
            "city":          card.get("cityname"),
            "country":       card.get("countryname"),
            "company_id":    card.get("companyid"),
            "sector":        card.get("sectorname"),
            "work_type":     card.get("worktypetext"),
            "work_model":    card.get("workmodeltext"),
            "job_status":    card.get("jobdatestatus"),
        })

    print(f"  → {len(cards_data)} unique cards extracted")
    return cards_data


# ── Single posting scraper ────────────────────────────────────────────────────

def scrape_posting(url: str, page: "playwright Page", referer: str | None = None) -> dict | None:
    """Returns the parsed posting, or None if the page never loaded (e.g. a
    captcha we couldn't solve) — the caller should skip it. The failed URL is
    already logged to FAILED_LOG_FILE by wait_for_selector_with_challenge.

    `referer` should be the listing page URL this posting was found on — it
    makes the request look like a real click-through instead of a cold direct
    hit, which bot detection tends to treat more suspiciously."""
    posting = {}

    posting["id"]  = url.split("-")[-1]
    posting["url"] = url

    if referer:
        page.goto(url, timeout=60000, referer=referer)
    else:
        page.goto(url, timeout=60000)
    if not wait_for_selector_with_challenge(page, '[data-test="job-title"]', url):
        return None
    html = page.content()
    soup = BeautifulSoup(html, "html.parser")

    posting["title"]    = _text(soup.find(attrs={"data-test": "job-title"}))
    posting["company"]  = _text(soup.find(attrs={"data-test": "company-name"}))
    posting["location"] = _text(soup.find(attrs={"data-test": "company-location"}))

    feature_container = soup.find(attrs={"data-test": "job-feature-list"})
    if feature_container:
        posting["features"] = [
            _text(el)
            for el in feature_container.find_all(attrs={"data-test": "job-feature-item"})
        ]
    else:
        posting["features"] = []

    headline = soup.find("div", class_="headline-top-box")
    if headline:
        posting["work_type"]         = headline.get("worktype")
        posting["position_level"]    = headline.get("positionlevel")
        posting["experience_level"]  = headline.get("experiencelevel")
        posting["department"]        = headline.get("departmentname")
        posting["application_count"] = headline.get("applicationcount")
        posting["work_model"]        = headline.get("workmodeltext")
    else:
        posting["work_type"] = posting["position_level"] = None
        posting["experience_level"] = posting["department"] = None
        posting["application_count"] = posting["work_model"] = None

    job_container = soup.find("div", class_="job-container")
    if job_container:
        posting["date_posted"]  = job_container.get("lastpublishdate")
        posting["closing_date"] = job_container.get("closingdate")
        posting["is_active"]    = job_container.get("isactive") == "true"
    else:
        posting["date_posted"] = posting["closing_date"] = None
        posting["is_active"] = None

    desc = soup.find("div", class_="job-detail-container-description")
    if desc:
        posting["description_text"] = desc.get_text(separator="\n", strip=True)
        posting["description_html"] = desc.decode_contents()
    else:
        posting["description_text"] = None
        posting["description_html"] = None

    posting["candidate_criteria"] = _parse_candidate_criteria(soup)

    return posting


def _parse_candidate_criteria(soup: BeautifulSoup) -> dict:
    criteria = {}
    container = soup.find("div", class_="alignment-list")
    if not container:
        return criteria

    titles = container.find_all(attrs={"data-test": "alignment-list-title"})
    values = container.find_all(attrs={"data-test": "alignment-list-value"})

    for title_el, value_el in zip(titles, values):
        bullet = title_el.find("span", class_="bullet")
        if bullet:
            bullet.extract()
        key   = title_el.get_text(strip=True).lower()
        value = value_el.get_text(strip=True)

        if "tecrübe" in key:
            criteria["experience"] = value
        elif "eğitim" in key:
            criteria["education"] = value

    return criteria


# ── Helpers ───────────────────────────────────────────────────────────────────

def _text(tag) -> str | None:
    return tag.get_text(strip=True) if tag else None


def load_seen_ids(output_file: str) -> set:
    """Load already-scraped posting IDs to avoid duplicates."""
    seen = set()
    try:
        with open(output_file, "r", encoding="utf-8") as f:
            for line in f:
                data = json.loads(line)
                seen.add(data["id"])
    except FileNotFoundError:
        pass
    return seen


def save_posting(posting: dict):
    with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(posting, ensure_ascii=False) + "\n")


def save_curated_posting(posting: dict):
    with open(CURATED_OUTPUT_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(posting, ensure_ascii=False) + "\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    sync_from_s3()
    seen_ids = load_seen_ids(OUTPUT_FILE)
    print(f"Already scraped: {len(seen_ids)} postings")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="tr-TR",
            viewport={"width": 1280, "height": 800},
        )
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        page = context.new_page()

        total_saved = 0

        # Round-robin across sources: all sources' page 1 first, then all
        # sources' page 2, etc. A source drops out of rotation once a page
        # returns no cards or no new cards; the others keep going.
        active_sources = list(SOURCES)

        for page_num in range(1, MAX_PAGES_PER_SOURCE + 1):
            if not active_sources:
                print("\nAll sources exhausted.")
                break

            print(f"\n########## Page {page_num} — {len(active_sources)} active sources ##########")
            still_active = []

            for label, base_url in active_sources:
                page_url = build_page_url(base_url, page_num)
                print(f"\n=== Source: '{label}' — page {page_num} ===")
                cards = collect_cards(page_url, page)
                print(f"  Found {len(cards)} cards")

                if not cards:
                    print("  No cards on this page — dropping source from rotation.")
                    continue

                new_cards = [c for c in cards if c["id"] not in seen_ids]
                print(f"  New (not yet scraped): {len(new_cards)}")

                if not new_cards:
                    print("  No new cards on this page — dropping source from rotation.")
                    continue

                for i, card in enumerate(new_cards, 1):
                    if card["id"] in seen_ids:  # re-check inside loop to catch within-batch dupes
                        continue

                    # Coarse pre-filter on the listing card (title + sector
                    # only — department isn't known until the detail page)
                    # before ever opening the detail page: kariyer.net's
                    # captcha makes every detail-page load expensive, so
                    # skip the obvious junk (sales, tourism, HR...) our
                    # broad search terms pull in. Postings this rejects
                    # never make it into the raw feed either — that's the
                    # tradeoff for not paying the captcha cost on them.
                    if not is_cs_relevant({"title": card.get("position_name"), "sector": card.get("sector")}):
                        seen_ids.add(card["id"])
                        continue

                    try:
                        # Scrape full posting and merge card-level metadata into it
                        posting = scrape_posting(card["url"], page, referer=page_url)
                        if posting is None:
                            print(f"  [{i}/{len(new_cards)}] SKIPPED (blocked/captcha): {card['url']}")
                            continue
                        posting.update({k: v for k, v in card.items() if k not in posting})
                        save_posting(posting)  # raw feed: everything we actually fetched
                        seen_ids.add(card["id"])
                        total_saved += 1

                        # Re-check relevance now that department + full
                        # description are known, and file into the curated
                        # CS/IT set with a specific role tag if it still holds.
                        if is_cs_relevant(posting):
                            posting["role"] = map_to_role(posting.get("title"), posting.get("description_text"))
                            save_curated_posting(posting)
                            print(f"  [{i}/{len(new_cards)}] Saved: {posting['title']} ({posting['role']}) — Total: {total_saved}")
                        else:
                            print(f"  [{i}/{len(new_cards)}] Saved to raw only (not CS): {posting['title']} — Total: {total_saved}")
                    except Exception as e:
                        print(f"  [{i}/{len(new_cards)}] FAILED {card['url']}: {e}")

                    time.sleep(random.uniform(2.0, 4.0))

                still_active.append((label, base_url))

            active_sources = still_active

        browser.close()

    sync_to_s3()
    print(f"\nDone. Total new postings saved: {total_saved}")


if __name__ == "__main__":
    main()
