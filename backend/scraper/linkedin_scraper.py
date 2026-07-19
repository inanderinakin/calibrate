"""
LinkedIn jobs scraper, via the linkedin-jobs-scraper library (spinlud's
py-linkedin-jobs-scraper) in ANONYMOUS mode (no login/cookie).

⚠ The library itself warns anonymous mode "is no longer maintained and it
won't probably work" — it has no official guarantee and could break without
warning if LinkedIn changes its site. Confirmed working (as of writing) from
both a residential IP and GitHub Actions' IP (unlike yenibiris.com, which
403s GitHub Actions specifically).

Produces the SAME JSONL schema as the other three scrapers, so the
downstream normalizer/skill-extraction pipeline treats every source
identically. No per-posting detail-page navigation is needed — LinkedIn's
search results already carry title/company/description/date, so this is
much faster than kariyer.net's captcha-gated flow.

Output: postings.jsonl (shared with kariyer/secretcv/yenibiris, one JSON
object per line, tagged with "source": "linkedin").
"""
import json
import logging
import os
import sys
import time

import boto3

from linkedin_jobs_scraper import LinkedinScraper
from linkedin_jobs_scraper.events import Events, EventData
from linkedin_jobs_scraper.query import Query, QueryOptions
import linkedin_jobs_scraper.strategies.anonymous_strategy as _anon_strategy

from relevance import is_cs_relevant, is_duplicate_posting, load_dedup_index, register_posting

# The library's internal logger ("li:scraper") dumps a full traceback (via
# logging.error(..., exc_info=True)) for every single per-job timeout AND
# every JS exception — extremely noisy over a long run and not actionable
# per-occurrence. We track our own timeout/error counts instead (see
# TIMEOUT_TAGS below and the counts dict in main()) and only report totals.
logging.getLogger("li:scraper").setLevel(logging.CRITICAL)

# The library hardcodes a 2-second timeout for loading each job's detail pane
# and for loading more results — too short for anonymous mode, especially as
# LinkedIn's response time grows over a long session (we saw "Timeout on
# loading job details" hit roughly 1-in-10 postings early in a run and much
# more often later on). There's no public parameter for this, so we
# monkey-patch the (name-mangled) private staticmethods to raise the default.
_JOB_DETAILS_TIMEOUT = 8
_LOAD_MORE_TIMEOUT = 8
_orig_load_job_details = _anon_strategy.AnonymousStrategy._AnonymousStrategy__load_job_details
_orig_load_more_jobs = _anon_strategy.AnonymousStrategy._AnonymousStrategy__load_more_jobs


def _patched_load_job_details(driver, selectors, job_id, timeout=_JOB_DETAILS_TIMEOUT):
    return _orig_load_job_details(driver, selectors, job_id, timeout=timeout)


def _patched_load_more_jobs(driver, selectors, job_links_tot, timeout=_LOAD_MORE_TIMEOUT):
    return _orig_load_more_jobs(driver, selectors, job_links_tot, timeout=timeout)


_anon_strategy.AnonymousStrategy._AnonymousStrategy__load_job_details = staticmethod(_patched_load_job_details)
_anon_strategy.AnonymousStrategy._AnonymousStrategy__load_more_jobs = staticmethod(_patched_load_more_jobs)

# Windows consoles default to a codepage (e.g. cp1254) that can't encode the
# Turkish characters / arrows in our prints — force UTF-8 so it doesn't crash.
sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)

# ── Search sources ────────────────────────────────────────────────────────────
# (label, keyword). Mirrors the CS/IT keyword coverage of the other scrapers'
# SOURCES lists. LinkedIn's search is title/skill-structured rather than
# naive substring matching, so broad terms are safe here (unlike kariyer.net).
SOURCES = [
    ("kw:software developer",          "software developer"),
    ("kw:software engineer",           "software engineer"),
    ("kw:yazılım geliştirici",         "yazılım geliştirici"),
    ("kw:yazılım mühendisi",           "yazılım mühendisi"),
    ("kw:backend developer",           "backend developer"),
    ("kw:frontend developer",          "frontend developer"),
    ("kw:full stack developer",        "full stack developer"),
    ("kw:devops engineer",             "devops engineer"),
    ("kw:data engineer",               "data engineer"),
    ("kw:data scientist",              "data scientist"),
    ("kw:machine learning engineer",   "machine learning engineer"),
    ("kw:mobile developer",            "mobile developer"),
    ("kw:qa engineer",                 "qa engineer"),
    ("kw:sistem yöneticisi",           "sistem yöneticisi"),
    ("kw:siber güvenlik",              "siber güvenlik"),
    ("kw:cloud engineer",              "cloud engineer"),
    ("kw:network engineer",            "network engineer"),
]

LOCATION = "Turkey"
MAX_RESULTS_PER_SOURCE = 300  # per-query cap. Tried 1000 (LinkedIn's own public-search
# ceiling) but even broad keywords ("software developer") topped out well under 300 in
# practice, so 1000 just meant extra time spent finding nothing new. Overridden to a
# small number for validation runs.

# All three other scrapers (kariyer, secretcv, yenibiris) write into the SAME
# postings.jsonl — a "source" field on each posting tells them apart, and
# lets the cross-source dedup pass match the same real-world posting scraped
# from different sites.
_HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE_NAME = "linkedin"
OUTPUT_FILE = os.path.join(_HERE, "postings.jsonl")
FAILED_LOG_FILE = os.path.join(_HERE, "failed_pages_linkedin.log")

S3_BUCKET = "calibrate-teamthrow"
S3_POSTINGS_KEY = "scraper-data/postings.jsonl"
S3_FAILED_LOG_KEY = "scraper-data/failed_pages_linkedin.log"


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
            print(f"Failed to upload failed_pages_linkedin.log to S3: {e}")


def log_failed_query(label: str, reason: str):
    with open(FAILED_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')}\t{reason}\t{label}\n")


def load_seen_ids(output_file: str) -> set:
    """Load this scraper's already-scraped posting IDs. The file is shared
    across all four scrapers, so only count rows tagged with our own
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
    with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(posting, ensure_ascii=False) + "\n")


def event_to_posting(data: EventData) -> dict:
    """Map linkedin_jobs_scraper's EventData onto the shared posting schema
    (mirrors kariyer/secretcv/yenibiris field names)."""
    return {
        "id": data.job_id,
        "url": data.link,
        "title": data.title,
        "company": data.company,
        "location": data.place,
        "city": data.place.split(",")[0].strip() if data.place else None,
        "country": "Türkiye",
        "company_id": None,
        "sector": None,
        "department": None,
        "work_type": None,
        "work_model": None,
        "position_level": None,
        "experience_level": None,
        "application_count": None,
        "date_posted": data.date_text or data.date or None,
        "closing_date": None,
        "is_active": True,
        "job_status": None,
        "features": [],
        "description_text": data.description,
        "description_html": data.description_html,
        "candidate_criteria": {},
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    sync_from_s3()
    seen_ids = load_seen_ids(OUTPUT_FILE)
    dedup_index = load_dedup_index(OUTPUT_FILE)
    print(f"Already scraped: {len(seen_ids)} postings ({len(dedup_index)} unique across all sources)")

    counts = {"saved": 0, "skipped_not_cs": 0, "skipped_dupe": 0, "errors": 0}

    def on_data(data: EventData):
        if not data.job_id or data.job_id in seen_ids:
            return

        posting = event_to_posting(data)

        if not is_cs_relevant(posting):
            seen_ids.add(data.job_id)
            counts["skipped_not_cs"] += 1
            print(f"  [{data.query}] skipped (not CS): {posting['title']}")
            return

        if is_duplicate_posting(posting, dedup_index):
            seen_ids.add(data.job_id)
            counts["skipped_dupe"] += 1
            print(f"  [{data.query}] skipped (duplicate of another source): {posting['title']}")
            return

        save_posting(posting)
        register_posting(posting, dedup_index)
        seen_ids.add(data.job_id)
        counts["saved"] += 1
        print(f"  [{data.query}] Saved: {posting['title']} — Total: {counts['saved']}")

    def on_error(error):
        # `error` can be a huge multi-hundred-line string (the library embeds
        # a full traceback/native Chrome stacktrace even for routine
        # per-job timeouts) — keep only the first line so a run's log stays
        # readable; the total count is reported at the end instead.
        counts["errors"] += 1
        first_line = str(error).strip().split("\n", 1)[0]
        print(f"  [ERROR] {first_line}")

    # A single scraper/browser instance runs every query in sequence — reusing
    # it across all SOURCES avoids paying browser-startup cost per keyword.
    scraper = LinkedinScraper(headless=True, max_workers=1, slow_mo=1.3)
    scraper.on(Events.DATA, on_data)
    scraper.on(Events.ERROR, on_error)

    queries = [
        Query(query=keyword, options=QueryOptions(locations=[LOCATION], limit=MAX_RESULTS_PER_SOURCE))
        for _, keyword in SOURCES
    ]

    try:
        scraper.run(queries)
    except Exception as e:
        print(f"[FAILED] run() raised: {e}")
        log_failed_query("run", f"run() failed: {e}")

    sync_to_s3()
    print(f"\nDone. Saved {counts['saved']} CS/IT postings, "
          f"skipped {counts['skipped_not_cs']} not-CS, {counts['skipped_dupe']} duplicates.")


if __name__ == "__main__":
    main()
