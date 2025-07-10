import path from "path";
import axios from "axios";
import {ArtistResponse} from "../types";

const USER_AGENT = `${process.env.APP_NAME}/${process.env.APP_VERSION} ( ${process.env.APP_CONTACT} )`;
const BASE_URL = `${process.env.MB_URL}artist?query=`;
const EXCLUDED = '%20NOT%20artist:%22Various%20Artists%22%20NOT%20artist:\[unknown\]';
const LIMIT = 20;
const CACHE_DIR = path.join(process.cwd(), 'data', 'genreArtists');
const CACHE_DURATION_DAYS = 60;

export const mbArtistSearch = async (query: string) => {
    try {
        const res = await axios.get<ArtistResponse>(`${BASE_URL}${query}&limit=${LIMIT}&offset=0`, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
            },
        });
        return res.data.artists.map(artist => {
            return {
                id: artist.id,
                name: artist.name,
                tags: artist.tags,
                location: artist.area ? artist.area.name : undefined,
                startDate: artist["life-span"] && artist["life-span"].begin ? artist["life-span"].begin.slice(0, 4) : undefined,
                endDate: artist["life-span"] && artist["life-span"].end ? artist["life-span"].end.slice(0, 4) : undefined,
            }
        })
    } catch (error) {
        console.error(`Error fetching artists for query ${query}:`, error);
        throw error;
    }
}