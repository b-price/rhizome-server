import {Genre, NodeLink} from "../types";

export const genreLinksByName = (genres: Genre[]) => {
    const links: NodeLink[] = [];
    const linkKeys = new Set(); // for deduplication
    const genreNames = new Map(); // lowercased genre name → genre ID

    genres
        .forEach(genre => {
            const lowerName = genre.name.toLowerCase();
            genreNames.set(lowerName, genre.id);
        });

    genres
        .forEach(genre => {
            const { id, name } = genre;
            const lowerName = name.toLowerCase();

            for (const [otherName, otherId] of genreNames.entries()) {
                if (otherName === lowerName) continue;

                // Check if `otherName` exists as a standalone phrase in `lowerName`
                const regex = new RegExp(`(^|[\\s&-])${escapeRegex(otherName)}($|[\\s&-])`, 'i');
                if (regex.test(lowerName)) {
                    const [a, b] = [id, otherId].sort(); // undirected
                    const key = `${a}:${b}`;
                    if (!linkKeys.has(key)) {
                        linkKeys.add(key);
                        links.push({ source: a, target: b });
                    }
                }
            }
        });

    return links;
}

// Helper to escape special regex chars
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');