#!/usr/bin/env python3
import json
import re
import sys
import time
from pathlib import Path
from typing import List, Dict, Any

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://musicbrainz.org/genre/"
HEADERS = {"User-Agent": "GenreScraper/1.1 (example@example.com)"}

TARGET_ROWS = {
    "subgenre of:":       "subgenre_of",
    "subgenres:":         "subgenres",
    "has fusion genres:": "fusion_genres",
    "fusion of:":         "fusion_of",
    "influenced by:":     "influenced_by",
    "influenced genres:": "influenced_genres",
}

UUID_RE = re.compile(r"/genre/([0-9a-f\-]{36})", re.I)

def _extract_links(cell) -> List[Dict[str, str]]:
    links = []
    for a in cell.find_all("a", href=True):
        match = UUID_RE.search(a["href"])
        if match:
            genre_id = match.group(1)
            bdi = a.find("bdi")
            name = bdi.get_text(strip=True) if bdi else a.get_text(strip=True)
            links.append({"id": genre_id, "name": name})
    return links


def scrape_single(genre: Dict[str, Any]) -> Dict[str, Any]:
    genre_id = genre["id"]
    name = genre["name"]
    artist_count = genre.get("artistCount", 0)

    url = f"{BASE_URL}{genre_id}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        print(f"Error fetching {genre_id} – {name}: {e}", file=sys.stderr)
        return {
            "id": genre_id,
            "name": name,
            "artistCount": artist_count,
            "wikipedia": None,
            **{k: [] for k in TARGET_ROWS.values()}
        }

    soup = BeautifulSoup(resp.text, "html.parser")

    # ---- Wikipedia section ----
    # wikipedia_text = None
    # wiki_section = soup.find("section", class_="wikipedia")
    # if wiki_section:
    #     first_paragraph = wiki_section.find("p")
    #     if first_paragraph:
    #         # Remove inline formatting tags (like <b>, <i>, <a>, etc.)
    #         for tag in first_paragraph.find_all(["b", "i", "a", "strong", "em"]):
    #             tag.unwrap()
    #         wikipedia_text = first_paragraph.get_text(strip=True)

    # ---- Relationships section ----
    h2 = soup.find("h2", class_="relationships")
    if not h2:
        print(f"Warning: No relationships section for {genre_id} – {name}", file=sys.stderr)
        return {
            "id": genre_id,
            "name": name,
            "artistCount": artist_count,
            #"wikipedia": wikipedia_text,
            **{k: [] for k in TARGET_ROWS.values()}
        }

    table = h2.find_next_sibling("table", class_="details")
    if not table:
        print(f"Warning: No details table after relationships for {genre_id} – {name}", file=sys.stderr)
        return {
            "id": genre_id,
            "name": name,
            "artistCount": artist_count,
            #"wikipedia": wikipedia_text,
            **{k: [] for k in TARGET_ROWS.values()}
        }

    result = {
        "id": genre_id,
        "name": name,
        "artistCount": artist_count,
        #"wikipedia": wikipedia_text,
    }

    for row in table.find_all("tr"):
        th = row.find("th")
        td = row.find("td")
        if not th or not td:
            continue
        heading = th.get_text(strip=True).lower()
        if heading in TARGET_ROWS:
            result[TARGET_ROWS[heading]] = _extract_links(td)

    for key in TARGET_ROWS.values():
        result.setdefault(key, [])

    return result



def scrape_genres_from_json(infile: Path, delay: float = 0.25) -> List[Dict[str, Any]]:
    raw = json.loads(infile.read_text())
    genres = raw["genres"]
    results = []

    for i, genre in enumerate(genres, 1):
        result = scrape_single(genre)
        results.append(result)
        print(f"[{i}/{len(genres)}] scraped {genre['name']}")
        time.sleep(delay)

    return results


def _cli():
    import argparse
    p = argparse.ArgumentParser(description="Scrape genre relationship data from MusicBrainz using a JSON input list.")
    p.add_argument("input_json", type=Path, help="Input JSON file with {'genres': [...]} structure")
    p.add_argument("-o", "--output", type=Path, default=Path("output.json"), help="Output JSON file")
    p.add_argument("-d", "--delay", type=float, default=0.5, help="Delay in seconds between requests (default: 0.6)")
    args = p.parse_args()

    results = scrape_genres_from_json(args.input_json, delay=args.delay)
    args.output.write_text(json.dumps(results, indent=2))
    print(f"\nDone. Scraped {len(results)} genres → {args.output}")


if __name__ == "__main__":
    _cli()
