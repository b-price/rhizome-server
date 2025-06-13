import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import throttleQueue from '../utils/throttleQueue';

interface Genre {
    id: string;
    name: string;
}

interface GenreResponse {
    'genre-count': number;
    genres: Genre[];
}

interface GenresJSON {
    count: number;
    genres: Genre[];
    date: string;
}

const USER_AGENT = `${process.env.APP_NAME}/${process.env.APP_VERSION} ( ${process.env.APP_CONTACT} )`;
const BASE_URL = `${process.env.MB_URL}genre/all`;
const LIMIT = 100;
const CACHE_DIR = path.join(process.cwd(), 'data', 'genres');
const CACHE_DURATION_DAYS = 60;

const ensureCacheDir = () => {
    try {
        if (!fs.existsSync(CACHE_DIR)) {
            fs.mkdirSync(CACHE_DIR, { recursive: true });
        }
    } catch (error) {
        console.error('Error creating cache directory:', error);
    }
};

const isCacheValid = (filePath: string): boolean => {
    try {
        if (!fs.existsSync(filePath)) {
            return false;
        }

        const stats = fs.statSync(filePath);
        const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        return ageInDays < CACHE_DURATION_DAYS;
    } catch (error) {
        console.error('Error checking cache validity:', error);
        return false;
    }
};

const loadFromCache = (filePath: string): GenresJSON | null => {
    try {
        if (!isCacheValid(filePath)) {
            return null;
        }

        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading from cache:', error);
        return null;
    }
};

const saveToCache = (filePath: string, data: GenresJSON): void => {
    try {
        ensureCacheDir();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving to cache:', error);
    }
};

const fetchGenres = async (limit: number, offset: number): Promise<Genre[]> => {
    const res = await axios.get<GenreResponse>(`${BASE_URL}?limit=${limit}&offset=${offset}`, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
        },
    });
    return res.data.genres.map(({ id, name }) => ({ id, name }));
};

export const getAllGenres = async (): Promise<Genre[]> => {
    const cacheFilePath = path.join(CACHE_DIR, 'allGenres.json');

    // Try to load from cache first
    const cachedData = loadFromCache(cacheFilePath);
    if (cachedData) {
        console.log('Returning cached genres data');
        return cachedData.genres;
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

        saveToCache(cacheFilePath, genresData);

        return allGenres;
    } catch (error) {
        console.error('Error fetching genres:', error);
        throw error;
    }
};