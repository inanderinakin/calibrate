import json
import time
import random
from urllib.parse import quote
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

# ── Search sources ────────────────────────────────────────────────────────────
# Each entry is (label, base_url). Pagination appends &page=N automatically.
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

OUTPUT_FILE = "postings.jsonl"


# ── Listing scraper: collects posting URLs from search results ────────────────

def _handle_press_and_hold(page) -> bool:
    """Detect and solve the kariyer.net press-and-hold bot challenge.
    Returns True if challenge was found and attempted."""
    try:
        button = page.locator("text=Basılı Tut").first
        button.wait_for(timeout=3000)
    except Exception:
        return False  # No challenge on this page

    print("  Bot challenge detected — attempting press and hold...")
    try:
        box = button.bounding_box()
        if not box:
            return False
        cx = box["x"] + box["width"] / 2
        cy = box["y"] + box["height"] / 2
        page.mouse.move(cx, cy)
        page.mouse.down()
        time.sleep(4)  # Hold for 4 seconds
        page.mouse.up()
        time.sleep(2)  # Wait for redirect
        print("  Press and hold completed.")
        return True
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

    # Wait for cards or handle bot challenge
    try:
        page.wait_for_selector('[data-test="ad-card"]', timeout=20000)
    except Exception:
        if _handle_press_and_hold(page):
            print("  Bot challenge solved, waiting for cards...")
            try:
                page.wait_for_selector('[data-test="ad-card"]', timeout=20000)
            except Exception:
                # If still no cards, pause and let user solve captcha manually
                print("  ⚠ No cards loaded. If you see a captcha, solve it manually.")
                print("    Waiting 30 seconds for you to solve it...")
                time.sleep(30)
                try:
                    page.wait_for_selector('[data-test="ad-card"]', timeout=10000)
                except Exception:
                    print("  Still no cards, moving on.")
                    return []
        else:
            # No press-and-hold either — might be geetest captcha, let user solve
            print("  ⚠ No cards loaded. If you see a captcha, solve it manually.")
            print("    Waiting 30 seconds for you to solve it...")
            time.sleep(30)
            try:
                page.wait_for_selector('[data-test="ad-card"]', timeout=10000)
            except Exception:
                print("  Still no cards, moving on.")
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

def scrape_posting(url: str, page: "playwright Page") -> dict:
    posting = {}

    posting["id"]  = url.split("-")[-1]
    posting["url"] = url

    page.goto(url, timeout=60000)
    page.wait_for_selector('[data-test="job-title"]', timeout=60000)
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


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
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

        for label, base_url in SOURCES:
            print(f"\n=== Source: '{label}' ===")

            cards = collect_cards(base_url, page)
            print(f"  Found {len(cards)} cards")

            new_cards = [c for c in cards if c["id"] not in seen_ids]
            print(f"  New (not yet scraped): {len(new_cards)}")

            for i, card in enumerate(new_cards, 1):
                if card["id"] in seen_ids:  # re-check inside loop to catch within-batch dupes
                    continue
                try:
                    # Scrape full posting and merge card-level metadata into it
                    posting = scrape_posting(card["url"], page)
                    posting.update({k: v for k, v in card.items() if k not in posting})
                    save_posting(posting)
                    seen_ids.add(card["id"])
                    total_saved += 1
                    print(f"  [{i}/{len(new_cards)}] Saved: {posting['title']} — Total: {total_saved}")
                except Exception as e:
                    print(f"  [{i}/{len(new_cards)}] FAILED {card['url']}: {e}")

                time.sleep(random.uniform(2.0, 4.0))

        browser.close()

    print(f"\nDone. Total new postings saved: {total_saved}")


if __name__ == "__main__":
    main()
