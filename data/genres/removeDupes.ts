import { readFileSync, writeFileSync } from 'fs';

interface Genre {
    id: string;
    name: string;
    artistCount?: number;
}

interface AllGenresFile {
    count: number;
    genres: Genre[];
}

function main() {
    const allGenresData = JSON.parse(readFileSync('allGenres.json', 'utf-8')) as AllGenresFile;
    const unfilteredGenresData = JSON.parse(readFileSync('unfilteredGenres.json', 'utf-8')) as Genre[];

    const existingIds = new Set(allGenresData.genres.map(g => g.id));

    const filteredGenres = unfilteredGenresData.filter(g => !existingIds.has(g.id));

    writeFileSync('noArtistsGenres.json', JSON.stringify(filteredGenres, null, 2), 'utf-8');

    console.log(`Filtered ${unfilteredGenresData.length - filteredGenres.length} duplicates.`);
    console.log(`Wrote ${filteredGenres.length} entries to noArtistsGenres.json`);
}

main();