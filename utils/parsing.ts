export const sanitizeGenre = (genreName: string) => {
    return genreName.replaceAll(' ', '_').replaceAll('&', 'ampersand').replaceAll('"', '').toLowerCase();
}

export const genreIsEqual = (genre1: string, genre2: string) => {
    return genre1.toLowerCase().replaceAll('"', '') === genre2.toLowerCase().replaceAll('"', '');
}

export function normalizeArtistName(name: string): string {
    return name
        .normalize("NFD")                         // separate diacritics
        .replace(/[\u0300-\u036f]/g, "")          // remove diacritics
        .toLowerCase()
        .replace(/\b(the|and)\b/g, "")            // remove whole words
        .replace(/[,\.'"!_\-+&]/g, "")            // remove specific punctuation
        .replace(/\s+/g, "")                      // remove whitespace
        .trim();
}

export function artistNamesMatch(a: string, b: string): boolean {
    return normalizeArtistName(a) === normalizeArtistName(b);
}