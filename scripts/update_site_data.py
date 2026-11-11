#!/usr/bin/env python3
"""Refresh data/site-data.json (citation metrics + newest papers) from OpenAlex.

Run weekly by .github/workflows/update-site-data.yml; safe to run locally:
    python3 scripts/update_site_data.py

- Metrics: OpenAlex author record (cited_by_count, h_index). These differ slightly
  from Google Scholar, which has no public API.
- Latest papers: journal articles newer than MIN_DATE whose DOI is not already
  listed in index.html. Conference abstracts and datasets are skipped.
"""
import datetime
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request

ORCID = "0000-0003-0683-1369"
MIN_DATE = "2025-01-01"   # only surface papers published on/after this date
MAX_LATEST = 5
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "site-data.json")
API = "https://api.openalex.org"


def get(path, **params):
    key = os.environ.get("OPENALEX_API_KEY")
    if key:
        params["api_key"] = key
    url = f"{API}{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "dilloncorvino.com site-data updater"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


PARTICLES = {"van", "der", "den", "de", "von", "la", "le", "du", "di", "da", "del", "della", "ter", "ten", "dos", "das", "el", "al", "bin"}


def short_name(full):
    """'Gerrit van der Voort' -> 'van der Voort G'; 'Dillon Corvino' -> 'Corvino D'."""
    parts = full.replace(".", " ").split()
    if len(parts) < 2:
        return full
    i = len(parts) - 1
    while i > 1 and parts[i - 1].lower() in PARTICLES:
        i -= 1
    return f"{' '.join(parts[i:])} {''.join(p[0] for p in parts[:i]).upper()}"


def is_me(a):
    return (a.get("author", {}).get("orcid") or "").endswith(ORCID)


def format_authors(authorships):
    names = [(short_name(a["author"]["display_name"]), is_me(a)) for a in authorships]
    idx = next((i for i, (_, me) in enumerate(names) if me), None)
    if idx is None:
        return [{"name": n, "me": False} for n, _ in names[:3]], len(names) > 3
    out = []
    if idx == 0:
        out = [{"name": n, "me": me} for n, me in names[:3]]
        return out, len(names) > 3
    out.append({"name": names[0][0], "me": False})
    if idx > 1:
        out.append({"name": "…", "me": False})
    out.append({"name": names[idx][0], "me": True})
    return out, idx < len(names) - 1


def main():
    author = get(f"/authors/orcid:{ORCID}", select="cited_by_count,summary_stats")
    metrics = {
        "citations": int(author["cited_by_count"]),
        "h_index": int(author["summary_stats"]["h_index"]),
    }

    listed = set(m.lower() for m in re.findall(
        r"doi\.org/([^\"'\s<]+)", open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()))

    works = get(
        "/works",
        filter=f"authorships.author.orcid:{ORCID},type:article,primary_location.source.type:journal,"
               f"from_publication_date:{MIN_DATE}",
        sort="publication_date:desc",
        **{"per-page": 50},
        select="doi,title,publication_year,primary_location,authorships",
    )["results"]

    latest = []
    for w in works:
        doi = (w.get("doi") or "").replace("https://doi.org/", "")
        title = html.unescape(re.sub(r"<[^>]+>", "", w.get("title") or "")).strip()
        venue = ((w.get("primary_location") or {}).get("source") or {}).get("display_name") or ""
        if not doi or not title or doi.lower() in listed:
            continue
        if re.match(r"^\d+[A-Z]{1,3}\b", title) or "abstract" in venue.lower():
            continue  # conference abstracts (e.g. "508MO ...")
        authors, et_al = format_authors(w["authorships"])
        latest.append({
            "title": title, "venue": venue, "year": w["publication_year"],
            "doi": f"https://doi.org/{doi}", "authors": authors, "et_al": et_al,
        })
        if len(latest) == MAX_LATEST:
            break

    try:
        old = json.load(open(OUT, encoding="utf-8"))
    except Exception:
        old = {}
    new = {"metrics": metrics, "latest": latest, "source": "OpenAlex"}
    if {k: old.get(k) for k in new} == new:
        print("No change.")
        return 0
    new["updated"] = datetime.date.today().isoformat()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(new, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")

    sm = os.path.join(ROOT, "sitemap.xml")
    txt = open(sm, encoding="utf-8").read()
    open(sm, "w", encoding="utf-8").write(
        re.sub(r"<lastmod>[^<]*</lastmod>", f"<lastmod>{new['updated']}</lastmod>", txt))
    print(f"Updated: {metrics}, {len(latest)} new paper(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
