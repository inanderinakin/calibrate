from datetime import date


def drop_expired(postings: list[dict], today: str | None = None) -> list[dict]:
    """Postings whose closing date has not passed.

    build_postings.py already filters these out, but it does so once and the artifact
    is then served for days, so postings quietly go stale in it. Anything with no
    closing date stays: plenty of boards never publish one, and dropping those would
    empty the page.

    Kept clear of handleposting so the tests can import it without boto3.
    """
    cutoff = today or date.today().isoformat()

    return [
        posting for posting in postings
        if not posting.get("closing_date") or posting["closing_date"] >= cutoff
    ]
