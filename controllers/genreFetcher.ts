import axios from 'axios';
import * as path from 'path';
import throttleQueue from '../utils/throttleQueue';
import {loadFromCache, saveToCache} from "../utils/cacheOps";
import {ArtistResponse, Genre, GenresJSON, MBGenre, NodeLink} from "../types";
import {genreLinksByName} from "../utils/genreLinksByName";
import {genreLinksByRelation} from "../utils/genreLinksByRelation";
import {scrapeGenres} from "../utils/mbGenresScraper";

interface GenreResponse {
    'genre-count': number;
    genres: MBGenre[];
}

const USER_AGENT = `${process.env.APP_NAME}/${process.env.APP_VERSION} ( ${process.env.APP_CONTACT} )`;
const BASE_URL = `${process.env.MB_URL}genre/all`;
const ARTISTS_URL = `${process.env.MB_URL}artist?query=tag:`;
const EXCLUDED = '%20NOT%20artist:%22Various%20Artists%22%20NOT%20artist:\[unknown\]';
const LIMIT = 100;
const CACHE_DIR = path.join(process.cwd(), 'data', 'genres');
const CACHE_DURATION_DAYS = 120;
const FILTER_THRESHOLD = 0;

const fetchGenres = async (limit: number, offset: number): Promise<MBGenre[]> => {
    const res = await axios.get<GenreResponse>(`${BASE_URL}?limit=${limit}&offset=${offset}`, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
        },
    });
    return res.data.genres.map(({ id, name }) => ({ id, name }));
};

const fetchArtistsCount = async (genre: string): Promise<number> => {
    const res = await axios.get<ArtistResponse>(`${ARTISTS_URL}${genre}&limit=1&offset=0`, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
        },
    });

    return res.data.count;
};

export const getAllGenres = async (): Promise<GenresJSON> => {
    const cacheFilePath = path.join(CACHE_DIR, 'allGenres.json');

    // Try to load from cache first
    const cachedData = loadFromCache(cacheFilePath, CACHE_DURATION_DAYS);
    if (cachedData.valid === 'valid' && cachedData.data && "genres" in cachedData.data) {
        console.log('Returning cached genres data');
        return cachedData.data;
    }

    console.log('Fetching fresh genres data from API...');

    try {
        const firstRes = await axios.get<GenreResponse>(`${BASE_URL}?limit=1&offset=0`, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
            },
        });

        const total = firstRes.data['genre-count'];
        const allGenres: Genre[] = [];

        // Retrieve each page of genres (100 per request)
        for (let offset = 0; offset < total; offset += LIMIT) {
            const genres = await throttleQueue.enqueue(() => fetchGenres(LIMIT, offset));
            allGenres.push(...genres);
        }

        if (!allGenres || allGenres.length === 0) {
            throw new Error('No genres found!');
        }

        // Check if we have stale cache data and if the genre list is the same
        if (cachedData.valid === 'stale' && cachedData.data && "genres" in cachedData.data) {
            const cachedGenreIds = new Set(cachedData.data.genres.map(g => g.id));
            const currentGenreIds = new Set(allGenres.map(g => g.id));

            // Check if the sets are identical
            const sameGenres = cachedGenreIds.size === currentGenreIds.size &&
                [...cachedGenreIds].every(id => currentGenreIds.has(id));

            if (sameGenres) {
                console.log('Genre list unchanged, reusing stale cache data');
                const reusedData: GenresJSON = {
                    ...cachedData.data,
                    date: new Date().toISOString()
                };
                saveToCache(cacheFilePath, reusedData, CACHE_DIR);
                console.log('Stale cache data refreshed and saved');
                return reusedData;
            }
        }

        // Get the artist count of each genre (slow, avoid if possible)
        for (const genre of allGenres) {
            genre.artistCount = await throttleQueue
                .enqueue(() => fetchArtistsCount(`"${genre.name.replaceAll('&', '%26')}"`));
        }

        // Filter out genres with no artists
        const filteredGenres = allGenres.filter(g => g.artistCount > FILTER_THRESHOLD);

        // Scrape genre relations from MusicBrainz
        console.log('Scraping genre relations from MusicBrainz...');
        const scrapedGenres = await scrapeGenres(filteredGenres, 300);

        // Generate links
        const links = genreLinksByRelation(scrapedGenres);

        // Save to cache
        const genresData: GenresJSON = {
            count: scrapedGenres.length,
            genres: scrapedGenres,
            links,
            date: new Date().toISOString()
        };

        saveToCache(cacheFilePath, genresData, CACHE_DIR);
        console.log(`Genres saved to cache.`)

        return genresData;
    } catch (error) {
        console.error('Error fetching genres:', error);
        throw error;
    }
};