export const sanitizeGenre = (genreName: string) => {
    return genreName.replaceAll(' ', '_').replaceAll('&', 'ampersand').replaceAll('"', '').toLowerCase();
}

export const genreIsEqual = (genre1: string, genre2: string) => {
    return genre1.toLowerCase().replaceAll('"', '') === genre2.toLowerCase().replaceAll('"', '');
}