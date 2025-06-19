import axios from 'axios';
import * as path from 'path';
import throttleQueue from '../utils/throttleQueue';
import {loadFromCache, saveToCache} from "../utils/cacheOps";

export interface Genre {
    id: string;
    name: string;
}

interface GenreResponse {
    'genre-count': number;
    genres: Genre[];
}

export interface GenresJSON {
    count: number;
    genres: Genre[];
    date: string;
}

const USER_AGENT = `${process.env.APP_NAME}/${process.env.APP_VERSION} ( ${process.env.APP_CONTACT} )`;
const BASE_URL = `${process.env.MB_URL}genre/all`;
const LIMIT = 100;
const CACHE_DIR = path.join(process.cwd(), 'data');
const CACHE_DURATION_DAYS = 60;

const fetchGenres = async (limit: number, offset: number): Promise<Genre[]> => {
    const res = await axios.get<GenreResponse>(`${BASE_URL}?limit=${limit}&offset=${offset}`, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
        },
    });
    return res.data.genres.map(({ id, name }) => ({ id, name }));
};

export const getAllGenres = async (): Promise<GenresJSON> => {
    const cacheFilePath = path.join(CACHE_DIR, 'allGenres.json');

    // Try to load from cache first
    const cachedData = loadFromCache(cacheFilePath, CACHE_DURATION_DAYS);
    if (cachedData && "genres" in cachedData) {
        console.log('Returning cached genres data');
        return cachedData;
    }

    console.log('Fetching fresh genres data from API');

    try {
        const firstRes = await axios.get<GenreResponse>(`${BASE_URL}?limit=1&offset=0`, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
            },
        });

        const total = firstRes.data['genre-count'];
        const allGenres: Genre[] = [];

        for (let offset = 0; offset < total; offset += LIMIT) {
            const genres = await throttleQueue.enqueue(() => fetchGenres(LIMIT, offset));
            allGenres.push(...genres);
        }

        // Save to cache
        const genresData: GenresJSON = {
            count: total,
            genres: allGenres,
            date: new Date().toISOString()
        };

        saveToCache(cacheFilePath, genresData, CACHE_DIR);

        return genresData;
    } catch (error) {
        console.error('Error fetching genres:', error);
        throw error;
    }
};