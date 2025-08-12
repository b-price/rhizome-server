import * as cheerio from 'cheerio';
import {Genre, MBGenre, SimpleGenre} from '../types';

const BASE_URL = "https://musicbrainz.org/genre/";
const HEADERS = { "User-Agent": "GenreScraper/1.1 (example@example.com)" };

const TARGET_ROWS_LINKS: { [key: string]: GenreRelationKeys } = {
    "subgenre of:": "subgenre_of",
    "subgenres:": "subgenres",
    "has fusion genres:": "fusion_genres",
    "fusion of:": "fusion_of",
    "influenced by:": "influenced_by",
    "influenced genres:": "influenced_genres",
};

const TARGET_ROWS_OTHER: { [key: string]: GenreDataKeys } = {
    "from:": "from",
    "named after area:": "named_after_area",
    "used instruments:": "used_instruments",
};

const UUID_RE = /\/genre\/([0-9a-f\-]{36})/i;

type GenreRelationKeys = {
    [K in keyof Genre]: Genre[K] extends MBGenre[] ? K : never
}[keyof Genre];

type GenreDataKeys = {
    [K in keyof Genre]: K
}[keyof Genre];

function extractLinks($: cheerio.CheerioAPI, cell: cheerio.Cheerio<any>): MBGenre[] {
    const links: MBGenre[] = [];

    cell.find('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (!href) return;

        const match = UUID_RE.exec(href);
        if (match) {
            const genreId = match[1];
            const bdi = $(element).find('bdi');
            const name = bdi.length > 0 ? bdi.text().trim() : $(element).text().trim();
            links.push({ id: genreId, name });

        }
    });

    return links;
}

function extractData($: cheerio.CheerioAPI, cell: cheerio.Cheerio<any>): string[] {
    const data: string[] = [];
    cell.find('bdi').each((_, element) => {
        data.push($(element).text().trim());
    });
    console.log(data)
    return data;
}

export async function scrapeSingle(genre: SimpleGenre, genreIds: Set<string>): Promise<Genre> {
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

        const tables = [];
        let table = relationshipsH2.next('table.details');
        if (table.length === 0) {
            console.warn(`Warning: No details table after relationships for ${genreId} – ${name}`);
            return emptyResult;
        }
        while (table.length > 0) {
            tables.push(table);
            table = table.next('table.details');
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
            from: [],
            named_after_area: [],
            used_instruments: [],
        };

        for (const details of tables) {
            details.find('tr').each((_, row) => {
                const th = $(row).find('th');
                const td = $(row).find('td');

                if (th.length === 0 || td.length === 0) return;

                const heading = th.text().trim().toLowerCase();
                if (heading in TARGET_ROWS_LINKS) {
                    const key = TARGET_ROWS_LINKS[heading];
                    if (key) result[key] = extractLinks($, td);
                } else if (heading in TARGET_ROWS_OTHER) {
                    const key = TARGET_ROWS_OTHER[heading];
                    if (key) { // @ts-ignore
                        result[key] = extractData($, td);
                    }
                }
            });
        }


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