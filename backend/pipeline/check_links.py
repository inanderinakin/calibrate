"""
Ask each job board whether a posting is still up, and remember the answer.

Every board says "gone" differently, and none of them do it with a status code
you can trust on its own:

  kariyer.net   a dead posting 302s to the /is-ilanlari listing page
  linkedin      a dead posting really does 404, but a posting that is merely
                closed still returns 200 and renders normally -- the only
                difference is the line "Artık başvuru kabul etmiyor" where the
                apply button used to be. 56% of the LinkedIn postings the page
                was showing were closed like this.
  yenibiris     dead pages still return 200, but drop the JobPosting JSON-LD
  secretcv      same as yenibiris

Text matching for deadness does not work here. Live pages ship the strings
"bulunamadı" and "404" inside their own script bundles, so grepping the body
marks everything dead. The closed-applications line is different, and was
checked before it was trusted: it appears on 10 of 18 sampled pages, not 18 of
18, so it is rendered content rather than bundled string.

The boards rate limit hard: 6 workers with no delay got 429 on 1,345 of 1,821
requests. One worker per host at 2s is fine. Requests are bucketed by host so
kariyer and linkedin do not wait on each other.
"""
import json
import re
import threading
import time
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import jsonlines as jl
import requests

postings_path = Path(__file__).parent.parent / "scraper" / "postings.jsonl"
link_status_path = Path(__file__).parent.parent / "app" / "link_status.json"

undated_window_days = 45
recheck_after_days = 7
rule_version = 2
default_budget = 600
request_spacing_seconds = 2.0
request_timeout_seconds = (10, 20)
throttle_retries = 1
throttle_backoff_seconds = 8
run_deadline_seconds = 45 * 60

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
}
linkedin_closed = re.compile(
    r"Art[ıi]k ba[şs]vuru kabul etmiyor|No longer accepting applications",
    re.IGNORECASE,
)

job_posting_schema = re.compile(r'"@type"\s*:\s*"JobPosting"')
throttled_codes = {403, 429}

def parse_date(value):
    if not value:
        return None
    for pattern in ("%d.%m.%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(str(value), pattern).date()
        except ValueError:
            continue
    return None

def is_active(posting, today):
    """Still open, or undated but recent enough that we have no evidence it closed."""
    closing = parse_date(posting.get("closing_date"))
    if closing:
        return closing >= today

    posted = parse_date(posting.get("date_posted"))
    return bool(posted and (today - posted).days <= undated_window_days)

def read_status():
    if not link_status_path.exists():
        return {}
    with open(link_status_path, encoding="utf-8") as status_file:
        return json.load(status_file).get("postings", {})

def is_stale(entry, today):
    if entry.get("rule_version") != rule_version:
        return True
    checked = parse_date(entry.get("checked_at"))
    return not checked or (today - checked).days >= recheck_after_days

def verdict(source, status_code, final_url, body):
    if status_code in throttled_codes:
        return None, f"throttled {status_code}"
    if status_code != 200:
        return False, f"http {status_code}"
    if source == "kariyer":
        if "/is-ilani/" not in final_url:
            return False, "redirected to listing"
        return True, ""
    if source == "linkedin":
        if linkedin_closed.search(body):
            return False, "closed to applications"
        return True, ""
    if not job_posting_schema.search(body):
        return False, "no JobPosting schema"
    return True, ""

def check(session, posting):
    for attempt in range(throttle_retries + 1):
        try:
            response = session.get(posting["url"], timeout=request_timeout_seconds, allow_redirects=True)
        except requests.RequestException as error:
            if attempt == throttle_retries:
                return None, f"error {type(error).__name__}", None
            time.sleep(throttle_backoff_seconds)
            continue

        alive, reason = verdict(posting["source"], response.status_code, response.url, response.text)
        if alive is None and attempt < throttle_retries:
            time.sleep(throttle_backoff_seconds)
            continue
        return alive, reason, response.status_code

    return None, "throttled", None

def check_host(postings, results, lock, deadline):
    with requests.Session() as session:
        session.headers.update(headers)
        for posting in postings:
            if time.monotonic() > deadline:
                with lock:
                    results["skipped"] += 1
                continue

            alive, reason, status_code = check(session, posting)
            if alive is None:
                with lock:
                    results["skipped"] += 1
            else:
                with lock:
                    results["checked"][posting["id"]] = {
                        "alive": alive,
                        "status": status_code,
                        "reason": reason,
                        "checked_at": date.today().isoformat(),
                        "rule_version": rule_version,
                    }
                    done = len(results["checked"]) + results["skipped"]
                    if done % 50 == 0:
                        print(f"checked {done}", flush=True)
            time.sleep(request_spacing_seconds)

def check_links(budget=default_budget):
    today = date.today()

    with jl.open(postings_path) as reader:
        active = [posting for posting in reader if is_active(posting, today)]

    known = read_status()
    due = [posting for posting in active if is_stale(known.get(posting["id"], {}), today)]
    due.sort(key=lambda posting: bool(known.get(posting["id"])))
    due = due[:budget]

    print(f"{len(active)} active, {len(due)} to check this run", flush=True)

    buckets = {}
    for posting in due:
        buckets.setdefault(urlparse(posting["url"]).netloc, []).append(posting)

    results = {"checked": {}, "skipped": 0}
    lock = threading.Lock()
    deadline = time.monotonic() + run_deadline_seconds
    workers = [
        threading.Thread(target=check_host, args=(items, results, lock, deadline))
        for items in buckets.values()
    ]

    for worker in workers:
        worker.start()
    for worker in workers:
        worker.join()

    known.update(results["checked"])
    alive_count = sum(1 for entry in known.values() if entry["alive"])

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "checked_this_run": len(results["checked"]),
        "skipped_this_run": results["skipped"],
        "alive": alive_count,
        "known": len(known),
        "postings": known,
    }

    with open(link_status_path, "w", encoding="utf-8") as status_file:
        json.dump(payload, status_file, ensure_ascii=False, indent=1)

    print(f"checked {len(results['checked'])}, skipped {results['skipped']}, {alive_count} alive of {len(known)} known", flush=True)
    return payload

if __name__ == "__main__":
    check_links()
