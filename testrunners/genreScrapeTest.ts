import { readFileSync, writeFileSync } from 'fs';
import { scrapeGenres } from '../utils/mbGenresScraper';
import path from "path";

interface SimpleGenre {
    id: string;
    name: string;
    artistCount: number;
}

async function main() {
    try {
        // Read the genres from the JSON file
        const rawGenresDir = path.join(process.cwd(), 'data', 'genres', 'rawData');
        const rawGenresPath = path.join(rawGenresDir, 'rawGenres.json');
        const genresData = readFileSync(rawGenresPath, 'utf-8');
        const genres: SimpleGenre[] = JSON.parse(genresData);

        console.log(`Loaded ${genres.length} genres from data/genres.json`);
        console.log('Starting scrape...\n');

        // Scrape with 750ms delay between requests
        const scrapedGenres = await scrapeGenres(genres.slice(955, 980));

        // Save results
        const outputPath = path.join(rawGenresDir, 'scrapedGenres.json');
        writeFileSync(outputPath, JSON.stringify(scrapedGenres, null, 2));

        console.log(`\nDone! Scraped ${scrapedGenres.length} genres → ${outputPath}`);

        // Show a sample of the results
        if (scrapedGenres.length > 0) {
            console.log('\nSample result:');
            console.log(JSON.stringify(scrapedGenres[0], null, 2));
        }

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main().catch((err) => {console.log(err)});