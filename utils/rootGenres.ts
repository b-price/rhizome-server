import {Genre, GenreClusterMode} from "../types";

export const PARENT_FIELD_MAP: {
    subgenre: "subgenres";
    influence: "influenced_genres";
    fusion: "fusion_genres";
} = {
    subgenre: 'subgenres',
    influence: 'influenced_genres',
    fusion: 'fusion_genres',
}
export const CHILD_FIELD_MAP: {
    subgenre: 'subgenre_of',
    influence: 'influenced_by',
    fusion: 'fusion_of'
} = {
    subgenre: 'subgenre_of',
    influence: 'influenced_by',
    fusion: 'fusion_of',
}

// Returns the root genres of each type of heirarchy of a genre
export function getSpecificRootsOfGenre(genre: Genre, allGenres: Genre[]) {
    if (genre.subgenre_of.length === 0
        && genre.fusion_of.length === 0
        && genre.subgenres.length === 0
        && genre.fusion_genres.length === 0
        && genre.influenced_genres.length === 0
        && genre.influenced_by.length === 0) {
        return [];
    }
    const genresMap: Map<string, Genre> = new Map();
    allGenres.forEach(genre => {
        genresMap.set(genre.id, genre);
    });
    const rootSet: Set<string> = new Set();
    const visited = new Set<string>;
    function traverse(currentGenre: Genre, mode: GenreClusterMode) {
        if (currentGenre[CHILD_FIELD_MAP[mode]].length === 0) {
            rootSet.add(`${currentGenre.id}:${mode}`);
        } else if (!visited.has(currentGenre.id)) {
            visited.add(currentGenre.id);
            currentGenre[CHILD_FIELD_MAP[mode]].forEach(g => {
                const next = genresMap.get(g.id);
                if (next) traverse(next, mode);
            });
        }
    }
    if (genre.subgenre_of.length) {
        traverse(genre, 'subgenre');
        visited.clear();
    }
    if (genre.fusion_of.length) {
        traverse(genre, 'fusion');
        visited.clear();
    }
    if (genre.influenced_by.length) {
        traverse(genre, 'influence');
        visited.clear();
    }

    return Array.from(rootSet).map(g => {
        const setSplit = g.split(':');
        return { id: setSplit[0], type: setSplit[1] };
    });
}

// Returns the root genres of a genre given a list of heirarchy types
export function getGeneralRootsOfGenre(genre: Genre, allGenres: Genre[], treeModes: GenreClusterMode[]) {
    if (treeModes.length === 0 || allGenres.length === 0) return [];
    let singleton = true;
    treeModes.forEach(treeMode => {
        if (genre[PARENT_FIELD_MAP[treeMode]].length || genre[CHILD_FIELD_MAP[treeMode]].length) singleton = false;
    });
    if (singleton) return [];
    const genresMap: Map<string, Genre> = new Map();
    allGenres.forEach(genre => {
        genresMap.set(genre.id, genre);
    });
    const rootSet: Set<string> = new Set();
    function traverse(currentGenre: Genre) {
        let isRoot = true;
        treeModes.forEach(treeMode => {
            if (currentGenre[CHILD_FIELD_MAP[treeMode]].length) {
                isRoot = false;
            }
        });
        if (isRoot) {
            rootSet.add(currentGenre.id);
        } else {
            const nextGenres: string[] = [];
            treeModes.forEach(treeMode => {
                if (currentGenre[CHILD_FIELD_MAP[treeMode]].length) {
                    nextGenres.push(...currentGenre[CHILD_FIELD_MAP[treeMode]].map(g => g.id));
                }
            });
            if (nextGenres.length) {
                nextGenres.forEach(g => {
                    const next = genresMap.get(g);
                    if (next) traverse(next);
                })
            }
        }
    }
    traverse(genre);
    return Array.from(rootSet);
}