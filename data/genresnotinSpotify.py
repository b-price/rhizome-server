import json
import csv
import re
import unicodedata
from pathlib import Path

def normalise(name: str) -> str:
    """
    Lower-case, strip diacritics, and remove whitespace, &, -, : characters.
    """
    name = name.lower()
    name = unicodedata.normalize("NFKD", name)
    name = "".join(ch for ch in name if not unicodedata.combining(ch))
    name = re.sub(r"[\s&\-:]", "", name)
    return name

# Load JSON genres
with open("allGenres.json", "r", encoding="utf-8") as f:
    json_data = json.load(f)
    json_names = {genre["name"]: normalise(genre["name"]) for genre in json_data["genres"]}
    json_total = len(json_names)

# Load CSV genres
with open("enao-genres-latest.csv", "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    csv_names_normalised = {normalise(row["name"]) for row in reader}
    csv_total = len(csv_names_normalised)

# Compute names in JSON but not in CSV
missing = sorted(
    [original for original, norm in json_names.items() if norm not in csv_names_normalised]
)

# Output
print(f"Total genres in JSON: {json_total}")
print(f"Total genres in CSV: {csv_total}")
print(f"Genres in JSON but not in CSV (after normalization): {len(missing)}")
print()

for name in missing:
    print(name)
