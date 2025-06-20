import axios from 'axios';
import * as path from 'path';
import throttleQueue from '../utils/throttleQueue';
import {createArtistLinks} from "../utils/createArtistLinks";
import {loadFromCache, saveToCache} from "../utils/cacheOps";
import {getAllGenres} from "./genreFetcher";
import {ArtistResponse, GenreArtistCountsJSON} from "../types";

const GENRE = false;
const USER_AGENT = `${process.env.APP_NAME}/${process.env.APP_VERSION} ( ${process.env.APP_CONTACT} )`;
const BASE_URL = `${process.env.MB_URL}artist?query=${GENRE ? 'genre' : 'tag'}:`;
const EXCLUDED = '%20NOT%20artist:%22Various%20Artists%22%20NOT%20artist:\[unknown\]';
const CACHE_DIR = path.join(process.cwd(), 'data');
const CACHE_DURATION_DAYS = 120;

const genreMap = new Map<string, number>();

const fetchArtistsCount = async (genre: string): Promise<number> => {
    const res = await axios.get<ArtistResponse>(`${BASE_URL}${genre}&limit=1&offset=0`, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
        },
    });

    return res.data.count;
};

export const getGenreArtistCounts = async () => {
    const cacheFilePath = path.join(CACHE_DIR, 'genreArtistCounts.json');

    // Try to load from cache first
    const cachedData = loadFromCache(cacheFilePath, CACHE_DURATION_DAYS);
    if (cachedData && 'genreMap' in cachedData) {
        console.log(`Returning cached genre artists count data.`);
        return cachedData;
    }

    console.log(`Fetching fresh genre artists count data...`);

    const allGenres = await getAllGenres();
    if (!allGenres || allGenres.genres.length === 0) {
        throw new Error('No genres found!');
    }

    try {
        genreMap.clear();

        for (const genre of allGenres.genres) {
            const count = await throttleQueue.enqueue(() => fetchArtistsCount(`"${genre.name.replaceAll('&', '%26')}"`));
            genreMap.set(genre.id, count);
        }

        const genreCounts: GenreArtistCountsJSON = {
            genreMap: Object.fromEntries(genreMap),
            date: new Date().toISOString()
        }

        // Save to cache
        saveToCache(cacheFilePath, genreCounts, CACHE_DIR);

        console.log(`Genre artists counts saved to cache.`)

        return genreCounts;
    } catch (error) {
        console.error(`Error fetching genre artists counts:`, error);
        throw error;
    }
};