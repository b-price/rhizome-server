#!/usr/bin/env python3
"""
Find genre names that occur in BOTH allGenres.json and enao-genres-latest.csv,
after normalising case, diacritics, whitespace, ampersands, hyphens, and colons.
"""

import csv
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path


def normalise(name: str) -> str:
    """
    Lower-case, strip diacritics, and remove whitespace, &, -, : characters.
    """
    # Lower-case
    name = name.lower()

    # Strip diacritics (e.g. "é" → "e")
    name = unicodedata.normalize("NFKD", name)
    name = "".join(ch for ch in name if not unicodedata.combining(ch))

    # Remove whitespace, ampersand, hyphen, colon
    name = re.sub(r"[\s&\-:]", "", name)

    return name


def load_json_names(path: Path):
    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    # Keep a map from normalised form → list of original spellings
    norm_to_originals = defaultdict(list)
    for genre in data["genres"]:
        original = genre["name"]
        norm_to_originals[normalise(original)].append(original)
    return norm_to_originals


def load_csv_norms(path: Path):
    with path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return {normalise(row["name"]) for row in reader}


def main():
    json_file = Path("allGenres.json")
    csv_file = Path("enao-genres-latest.csv")

    json_norm_map = load_json_names(json_file)
    csv_norm_set = load_csv_norms(csv_file)

    # Intersection on normalised keys
    common_norms = json_norm_map.keys() & csv_norm_set

    # Flatten originals, preserve alphabetical order (case-sensitive)
    common_originals = sorted(
        {orig for norm in common_norms for orig in json_norm_map[norm]}
    )

    print("Genres appearing in BOTH datasets (after normalisation):")
    for name in common_originals:
        print(name)


if __name__ == "__main__":
    main()
