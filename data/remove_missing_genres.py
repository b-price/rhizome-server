import json

# Load the JSON data
with open("genre_scrape.json", "r", encoding="utf-8") as f:
    genres = json.load(f)

# Create a set of all valid IDs
valid_ids = {genre["id"] for genre in genres}

# Fields to validate
relation_fields = [
    "subgenre_of",
    "influenced_genres",
    "subgenres",
    "fusion_genres",
    "fusion_of",
    "influenced_by"
]

# Filter each relation field to only include references with valid IDs
for genre in genres:
    for field in relation_fields:
        genre[field] = [ref for ref in genre.get(field, []) if ref["id"] in valid_ids]

# Save the filtered result
with open("filtered_genres.json", "w", encoding="utf-8") as f:
    json.dump(genres, f, ensure_ascii=False, indent=2)
