import axios from 'axios';
import throttleQueue from '../utils/throttleQueue';
import {createLinks} from "../utils/createLinks";

interface Tag {
    name: string;
    count: number;
}

interface ArtistData {
    id: string;
    name: string;
    score: number;
    tags: Tag[];
    area: { name: string };
    "life-span": { begin: string, end: string };
}

interface Artist {
    id: string;
    name: string;
    tags: Tag[];
    location?: string;
    startDate?: string;
}

interface ArtistResponse {
    count: number;
    artists: ArtistData[];
}

interface ArtistJSON {
    count: number;
    artists: Artist[];
    links: ArtistLink[];
    date: string;
    genre: string;
}

export type ArtistLink = [string, string];

const USER_AGENT = `${process.env.APP_NAME}/${process.env.APP_VERSION} ( ${process.env.APP_CONTACT} )`;
const BASE_URL = `${process.env.MB_URL}artist?query=tag:`;
const EXCLUDED = '%20NOT%20artist:%22Various%20Artists%22%20NOT%20artist:\[unknown\]';
const LIMIT = 100;

const tagMap = new Map<string, string[]>();

const fetchArtists = async (limit: number, offset: number, genre: string): Promise<Artist[]> => {

    const res = await axios.get<ArtistResponse>(`${BASE_URL}${genre}&limit=${limit}&offset=${offset}`, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
        },
    });
    return res.data.artists.map(artist => {
        // Creates tag map while iterating through the artists
        const tags = artist.tags.filter(t => t.count > 0 && t.name !== genre);
        tags.forEach((tag: Tag) => {
            const tagArtists = tagMap.get(tag.name);
            if (tagArtists) {
                tagMap.set(tag.name, [...tagArtists, artist.name]);
            } else {
                tagMap.set(tag.name, [artist.name]);
            }
        })
        return {
            id: artist.id,
            name: artist.name,
            tags: tags,
            location: artist.area ? artist.area.name : undefined,
            startDate: artist["life-span"] ? artist["life-span"].begin : undefined,
        }
    });
};

export const getAllArtists = async (genre: string): Promise<ArtistJSON> => {
    tagMap.clear();
    const firstRes = await axios.get<ArtistResponse>(`${BASE_URL}${genre}&limit=1&offset=0`, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
        },
    });

    const total = firstRes.data.count;
    const allArtists: Artist[] = [];

    for (let offset = 0; offset < total; offset += LIMIT) {
        const artists = await throttleQueue.enqueue(() => fetchArtists(LIMIT, offset, genre));
        allArtists.push(...artists);
    }

    const artistStruct = {
        count: total,
        artists: allArtists,
        links: createLinks(tagMap),
        date: new Date().toDateString(),
        genre: genre
    };

    return artistStruct;
};
