import axios from 'axios';
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

    return allGenres;
};
