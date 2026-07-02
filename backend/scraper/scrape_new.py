"""
Incremental scraper — run this daily/weekly to pick up NEW postings only.

Reuses everything from scraper.py (browser setup, card/posting parsing,
seen_ids tracking) but adds an early-stop: once a listing page's cards are
mostly IDs we've already scraped, we stop scrolling that source instead of
walking the whole page every time. Saves time as postings.jsonl grows.

Usage:
    python scrape_new.py
"""
import time
import random

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

from scraper import (
    SOURCES,
    OUTPUT_FILE,
    _handle_press_and_hold,
    scrape_posting,
    load_seen_ids,
    save_posting,
)

# Stop scrolling a source once this many consecutive extracted cards
# are already-known IDs (listings are roughly newest-first).
STOP_AFTER_CONSECUTIVE_SEEN = 15


def collect_new_cards(base_url: str, page, seen_ids: set) -> list[dict]:
    """Like collect_cards(), but stops scrolling early once we're clearly
    back into already-scraped territory."""
    print(f"  Loading: {base_url}")
    page.goto(base_url, timeout=60000)

    try:
        page.wait_for_selector('[data-test="ad-card"]', timeout=20000)
    except Exception:
        if _handle_press_and_hold(page):
            try:
                page.wait_for_selector('[data-test="ad-card"]', timeout=20000)
            except Exception:
                print("  No cards after challenge. Solve captcha manually if shown...")
                time.sleep(30)
                try:
                    page.wait_for_selector('[data-test="ad-card"]', timeout=10000)
                except Exception:
                    print("  Still no cards, skipping source.")
                    return []
        else:
            print("  No cards loaded. Solve captcha manually if shown...")
            time.sleep(30)
            try:
                page.wait_for_selector('[data-test="ad-card"]', timeout=10000)
            except Exception:
                print("  Still no cards, skipping source.")
                return []

    def extract_cards():
        html = page.content()
        soup = BeautifulSoup(html, "html.parser")
        raw_cards = soup.find_all(attrs={"data-test": "ad-card"})
        out = []
        card_seen = set()
        for card in raw_cards:
            link = card.find(attrs={"data-test": "ad-card-item"})
            if not link:
                continue
            href = link.get("href", "")
            if not href.startswith("http"):
                href = "https://www.kariyer.net" + href
            card_id = href.split("-")[-1]
            if card_id in card_seen:
                continue
            card_seen.add(card_id)
            out.append({
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
        return out

    prev_count = 0
    for scroll_step in range(20):
        page.evaluate("window.scrollBy(0, 800)")
        time.sleep(0.5)
        current_count = page.locator('[data-test="ad-card"]').count()
        if current_count > prev_count:
            prev_count = current_count

        # Early-stop check: look at cards extracted so far, see how many
        # consecutive trailing ones (in DOM order) are already known.
        cards_so_far = extract_cards()
        if cards_so_far:
            trailing_seen = 0
            for c in reversed(cards_so_far):
                if c["id"] in seen_ids:
                    trailing_seen += 1
                else:
                    break
            if trailing_seen >= STOP_AFTER_CONSECUTIVE_SEEN:
                print(f"  Hit {trailing_seen} consecutive known postings — stopping early.")
                break

    cards_data = extract_cards()
    new_count = sum(1 for c in cards_data if c["id"] not in seen_ids)
    print(f"  → {len(cards_data)} cards on page, {new_count} new")
    return cards_data


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

            cards = collect_new_cards(base_url, page, seen_ids)
            new_cards = [c for c in cards if c["id"] not in seen_ids]

            for i, card in enumerate(new_cards, 1):
                if card["id"] in seen_ids:
                    continue
                try:
                    posting = scrape_posting(card["url"], page)
                    posting.update({k: v for k, v in card.items() if k not in posting})
                    save_posting(posting)
                    seen_ids.add(card["id"])
                    total_saved += 1
                    print(f"  [{i}/{len(new_cards)}] Saved: {posting['title']} — Total new: {total_saved}")
                except Exception as e:
                    print(f"  [{i}/{len(new_cards)}] FAILED {card['url']}: {e}")

                time.sleep(random.uniform(2.0, 4.0))

        browser.close()

    print(f"\nDone. New postings saved this run: {total_saved}")


if __name__ == "__main__":
    main()
