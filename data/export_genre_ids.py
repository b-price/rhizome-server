import json

# Optional: set this to a string to filter genre names (case-insensitive)
# Example: filter_str = "rock"
filter_str = "metal"  # or set to e.g., "metal"

# Load JSON file
with open("allGenres.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Filter genres by name if filter_str is set
filtered_genres = []
for genre in data["genres"]:
    if filter_str is None or filter_str.lower() in genre["name"].lower():
        filtered_genres.append(genre["id"])

# Write to file
with open("genre_ids.txt", "w", encoding="utf-8") as out:
    for gid in filtered_genres:
        out.write(gid + "\n")

print(f"Wrote {len(filtered_genres)} genre IDs to genre_ids.txt")
