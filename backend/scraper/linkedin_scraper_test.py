"""
Quick exploratory test for linkedin-jobs-scraper (spinlud/py-linkedin-jobs-scraper,
PyPI: linkedin-jobs-scraper) in ANONYMOUS mode (no login/cookie).

This is NOT a production scraper — it's a small probe to answer two questions
before committing to this library for real:
  1. Does anonymous mode actually return results from this environment?
     (The library itself warns anonymous mode "is no longer maintained" and
     its README notes it may fail entirely in cloud/CI environments like
     AWS/Heroku — GitHub Actions runners are the same kind of environment,
     so this needs to be verified from CI specifically, not just locally.)
  2. How relevant are the results for a plain "software developer" search
     (vs. kariyer.net's ~6% hit rate on broad keyword search)?

Run: python linkedin_scraper_test.py
Needs: pip install linkedin-jobs-scraper, and Chrome/Chromium installed.
"""
import sys
sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)

import logging
logging.basicConfig(level=logging.INFO)

from linkedin_jobs_scraper import LinkedinScraper
from linkedin_jobs_scraper.events import Events, EventData
from linkedin_jobs_scraper.query import Query, QueryOptions

results = []


def on_data(data: EventData):
    results.append((data.title, data.company))
    print(f"[DATA] {data.title} | {data.company}")


def on_error(error):
    print(f"[ERROR] {error}")


def on_end():
    print(f"[END] Total results: {len(results)}")


scraper = LinkedinScraper(headless=True, max_workers=1, slow_mo=1.3)
scraper.on(Events.DATA, on_data)
scraper.on(Events.ERROR, on_error)
scraper.on(Events.END, on_end)

scraper.run([
    Query(
        query="software developer",
        options=QueryOptions(
            locations=["Turkey"],
            limit=10,
        )
    )
])

print(f"\nFINAL RESULT COUNT: {len(results)}")
