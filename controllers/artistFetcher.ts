import axios from 'axios';
import * as path from 'path';
import throttleQueue from '../utils/throttleQueue';
import {createArtistLinks} from "../utils/createArtistLinks";
import {loadFromCache, saveToCache} from "../utils/cacheOps";
import {Artist, ArtistJSON, ArtistResponse, Tag} from "../types";

const GENRE = false;
const USER_AGENT = `${process.env.APP_NAME}/${process.env.APP_VERSION} ( ${process.env.APP_CONTACT} )`;
const BASE_URL = `${process.env.MB_URL}artist?query=${GENRE ? 'genre' : 'tag'}:`;
const EXCLUDED = '%20NOT%20artist:%22Various%20Artists%22%20NOT%20artist:\[unknown\]';
const LIMIT = 100;
const CACHE_DIR = path.join(process.cwd(), 'data', 'genreArtists');
const CACHE_DURATION_DAYS = 60;

const tagMap = new Map<string, string[]>();

const sanitizeGenre = (genreName: string) => {
    return genreName.replaceAll(' ', '_').replaceAll('&', 'ampersand').replaceAll('"', '').toLowerCase();
}

const genreIsEqual = (genre1: string, genre2: string) => {
    return genre1.toLowerCase().replaceAll('"', '') === genre2.toLowerCase().replaceAll('"', '');
}

const fetchArtists = async (limit: number, offset: number, genre: string): Promise<Artist[]> => {
    const res = await axios.get<ArtistResponse>(`${BASE_URL}${genre}&limit=${limit}&offset=${offset}`, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
        },
    });
    return res.data.artists.map(artist => {
        // Creates decade-location map while iterating through the artists
        let tags: Tag[] = [];
        if (artist.tags && artist.tags.length) {
            tags = artist.tags.filter((t: Tag) => t.count > 0 && !genreIsEqual(t.name, genre));
        }

        const location = artist.area ? artist.area.name : undefined;
        const startYear = artist["life-span"] && artist["life-span"].begin ? artist["life-span"].begin.slice(0, 4) : undefined;

        // Group artists by decade and location
        if (location && startYear && !isNaN(parseInt(startYear))) {
            const decade = Math.floor(parseInt(startYear) / 10) * 10;
            const decadeLocationKey = `${decade}s-${location}`;

            const existingArtists = tagMap.get(decadeLocationKey);
            if (existingArtists) {
                tagMap.set(decadeLocationKey, [...existingArtists, artist.id]);
            } else {
                tagMap.set(decadeLocationKey, [artist.id]);
            }
        }

        // Creates tag links
        // let tags: Tag[] = [];
        // if (artist.tags && artist.tags.length) {
        //     tags = artist.tags.filter(t => t.count > 0 && !genreIsEqual(t.name, genre));
        //     tags.forEach((tag: Tag) => {
        //         const tagArtists = tagMap.get(tag.name);
        //         if (tagArtists) {
        //             tagMap.set(tag.name, [...tagArtists, artist.id]);
        //         } else {
        //             tagMap.set(tag.name, [artist.id]);
        //         }
        //     })
        // }

        return {
            id: artist.id,
            name: artist.name,
            tags: tags,
            location: location,
            startDate: startYear,
            endDate: artist["life-span"] && artist["life-span"].end ? artist["life-span"].end.slice(0, 4) : undefined,
        }
    });
};

export const getAllArtists = async (genre: string): Promise<ArtistJSON> => {
    const cacheFilePath = path.join(CACHE_DIR, `${sanitizeGenre(genre)}Artists.json`);

    // Try to load from cache first
    const cachedData = loadFromCache(cacheFilePath, CACHE_DURATION_DAYS);
    if (cachedData && 'artists' in cachedData) {
        console.log(`Returning cached artists data for genre: ${genre}`);
        return cachedData;
    }

    console.log(`Fetching fresh artists data for genre: ${genre} ...`);

    try {
        const noAmpGenre = genre.replaceAll('&', '%26');
        tagMap.clear();
        const firstRes = await axios.get<ArtistResponse>(`${BASE_URL}${noAmpGenre}&limit=1&offset=0`, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
            },
        });

        if (firstRes.data.artists.length < 1) {
            throw new Error(`No artists found for genre ${genre}.`);
        }

        const total = firstRes.data.count;
        const allArtists: Artist[] = [];

        for (let offset = 0; offset < total; offset += LIMIT) {
            const artists = await throttleQueue.enqueue(() => fetchArtists(LIMIT, offset, noAmpGenre));
            allArtists.push(...artists);
        }

        const artistStruct: ArtistJSON = {
            count: total,
            artists: allArtists,
            links: createArtistLinks(tagMap),
            date: new Date().toISOString(),
            genre: genre
        };

        // Save to cache
        saveToCache(cacheFilePath, artistStruct, CACHE_DIR);

        console.log(`${genre} artists saved to cache.`)

        return artistStruct;
    } catch (error) {
        console.error(`Error fetching artists for genre ${genre}:`, error);
        throw error;
    }
};