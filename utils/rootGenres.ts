import {Genre} from "../types";

export function getRootGenresOfGenre(genre: Genre, allGenres: Genre[]) {
    const genresMap: Map<string, Genre> = new Map();
    allGenres.forEach(genre => {
        genresMap.set(genre.id, genre);
    });
    if (genre.subgenre_of.length === 0 && genre.fusion_of.length === 0 && genre.subgenres.length === 0 && genre.fusion_genres.length === 0) {
        return [];
    }
    const rootSet: Set<string> = new Set();
    function traverse(currentGenre: Genre) {
        if (currentGenre.subgenre_of.length === 0 && currentGenre.fusion_of.length === 0) {
            rootSet.add(currentGenre.id);
        } else {
            [...currentGenre.subgenre_of, ...currentGenre.fusion_of].forEach(g => {
                const next = genresMap.get(g.id);
                if (next) traverse(next);
            });
        }
    }
    traverse(genre);
    return Array.from(rootSet);
}

