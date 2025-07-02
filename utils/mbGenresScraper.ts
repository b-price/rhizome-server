import * as cheerio from 'cheerio';
import { Genre, GenreRelation } from '../types';

const BASE_URL = "https://musicbrainz.org/genre/";
const HEADERS = { "User-Agent": "GenreScraper/1.1 (example@example.com)" };

const TARGET_ROWS: { [key: string]: keyof Genre } = {
    "subgenre of:": "subgenre_of",
    "subgenres:": "subgenres",
    "has fusion genres:": "fusion_genres",
    "fusion of:": "fusion_of",
    "influenced by:": "influenced_by",
    "influenced genres:": "influenced_genres",
};

const UUID_RE = /\/genre\/([0-9a-f\-]{36})/i;

interface SimpleGenre {
    id: string;
    name: string;
    artistCount: number;
}

function extractLinks($: cheerio.CheerioAPI, cell: cheerio.Cheerio<any>, genreIds: Set<string>): GenreRelation[] {
    const links: GenreRelation[] = [];

    cell.find('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (!href) return;

        const match = UUID_RE.exec(href);
        if (match) {
            const genreId = match[1];
            // Only include if the genre is in our input array
            if (genreIds.has(genreId)) {
                const bdi = $(element).find('bdi');
                const name = bdi.length > 0 ? bdi.text().trim() : $(element).text().trim();
                links.push({ id: genreId, name });
            }
        }
    });

    return links;
}

async function scrapeSingle(genre: SimpleGenre, genreIds: Set<string>): Promise<Genre> {
    const { id: genreId, name, artistCount } = genre;
    const url = `${BASE_URL}${genreId}`;

    const emptyResult: Genre = {
        id: genreId,
        name,
        artistCount,
        subgenre_of: [],
        subgenres: [],
        fusion_genres: [],
        fusion_of: [],
        influenced_by: [],
        influenced_genres: [],
    };

    try {
        const response = await fetch(url, {
            headers: HEADERS,
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Find relationships section
        const relationshipsH2 = $('h2.relationships');
        if (relationshipsH2.length === 0) {
            console.warn(`Warning: No relationships section for ${genreId} – ${name}`);
            return emptyResult;
        }

        const table = relationshipsH2.next('table.details');
        if (table.length === 0) {
            console.warn(`Warning: No details table after relationships for ${genreId} – ${name}`);
            return emptyResult;
        }

        const result: Genre = {
            id: genreId,
            name,
            artistCount,
            subgenre_of: [],
            subgenres: [],
            fusion_genres: [],
            fusion_of: [],
            influenced_by: [],
            influenced_genres: [],
        };

        table.find('tr').each((_, row) => {
            const th = $(row).find('th');
            const td = $(row).find('td');

            if (th.length === 0 || td.length === 0) return;

            const heading = th.text().trim().toLowerCase();
            if (heading in TARGET_ROWS) {
                const key = TARGET_ROWS[heading];
                result[key] = extractLinks($, td, genreIds);
            }
        });

        return result;

    } catch (error) {
        console.error(`Error fetching ${genreId} – ${name}:`, error);
        return emptyResult;
    }
}

export async function scrapeGenres(genres: SimpleGenre[], delayMs: number = 500): Promise<Genre[]> {
    const genreIds = new Set(genres.map(g => g.id));
    const results: Genre[] = [];

    for (let i = 0; i < genres.length; i++) {
        const genre = genres[i];
        const result = await scrapeSingle(genre, genreIds);
        results.push(result);
        console.log(`[${i + 1}/${genres.length}] scraped ${genre.name}`);

        if (i < genres.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return results;
}