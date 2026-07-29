"""
One-off test: does yenibiris.com respond differently to a real browser
(Playwright, full JS + TLS handshake) than it does to the plain `requests`
calls yenibiris_scraper.py makes? Answers whether the 403s we see from
GitHub Actions are an IP/ASN-level block (this test would still fail) or a
bot-fingerprint block that a real browser engine can pass (this test would
succeed) even from the same GitHub Actions IP.

Not part of the production pipeline — just prints status/title/content so
the run's log can be read by hand. Delete once we have an answer.
"""
import sys

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)

URL = "https://www.yenibiris.com/is-ilanlari?q=yazilim"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="tr-TR",
        )
        page = context.new_page()

        print(f"Requesting: {URL}")
        response = page.goto(URL, timeout=30000)
        print(f"HTTP status: {response.status if response else 'no response object'}")
        print(f"Page title: {page.title()!r}")

        body_text = page.inner_text("body")
        print(f"Body text length: {len(body_text)} chars")
        print("First 500 chars of body text:")
        print(body_text[:500])

        job_links = page.locator("a[href*='/is-ilani/']").count()
        print(f"Detected job-posting links on page: {job_links}")

        browser.close()


if __name__ == "__main__":
    main()
