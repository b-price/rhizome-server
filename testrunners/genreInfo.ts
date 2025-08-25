import path from "path";
import fs from "fs";
import {Genre, MBGenre} from "../types";
import {getSingletons} from "../utils/getSingletons";
import {ensureCacheDir} from "../utils/cacheOps";
import axios from "axios";
import {GenreResponse} from "../controllers/genreFetcher";
import throttleQueue from "../utils/throttleQueue";

const APP_NAME='Rhizome'
const APP_VERSION="0.0.1"
const APP_CONTACT="bpricedev@gmail.com"
const MB_URL="https://musicbrainz.org/ws/2/"
const USER_AGENT = `${APP_NAME}/${APP_VERSION} ( ${APP_CONTACT} )`;
const BASE_URL = `${MB_URL}genre/all`;
const LIMIT = 100;

const fetchGenres = async (limit: number, offset: number): Promise<MBGenre[]> => {
    const res = await axios.get<GenreResponse>(`${BASE_URL}?limit=${limit}&offset=${offset}`, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
        },
    });
    return res.data.genres.map(({ id, name }) => ({ id, name }));
};

async function genreInfo() {
    try {
        // Read the genres from the JSON file
        const filePath = path.join(__dirname, '..', 'data', 'genres', 'allGenres.json');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const genres: Genre[] = JSON.parse(fileContent).genres;

        console.log(`Loaded ${genres.length} genres from allGenres.json`);

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

        const rawGenresDir = path.join(process.cwd(), 'data', 'genres', 'rawData');
        const rawGenresPath = path.join(rawGenresDir, 'rawGenres.json');
        ensureCacheDir(rawGenresDir);
        console.log(`Saving ${allGenres ? allGenres.length : 0} raw genres...`);
        fs.writeFileSync(rawGenresPath, JSON.stringify(allGenres, null, 2));
        console.log('Saved raw genres to cache.')

        const noArtistGenres = allGenres.filter(g => !genres.find(genre => g.id === genre.id));

        const noArtistGenresDir = path.join(process.cwd(), 'data', 'genres', 'rawData');
        const noArtistGenresPath = path.join(noArtistGenresDir, 'noArtistGenres.json');
        console.log(`Saving ${noArtistGenres ? noArtistGenres.length : 0} no artist genres...`);
        ensureCacheDir(noArtistGenresDir);
        fs.writeFileSync(noArtistGenresPath, JSON.stringify(noArtistGenres, null, 2));
        console.log('Saved no artist genres to cache.')

    } catch (err) {
        console.error(err);
    }
}

if (require.main === module) {
    genreInfo();
}