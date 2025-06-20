import path from "path";
import {loadFromCache, saveToCache} from "../utils/cacheOps";
import axios from "axios";
import {LastFMArtistJSON, LastFMImage} from "../types";

const BASE_URL = `${process.env.LASTFM_URL}?method=artist.getinfo&mbid=`;
const URL_CONFIG = `&api_key=${process.env.LASTFM_API_KEY}&format=json`;
const CACHE_DIR = path.join(process.cwd(), 'data', 'artists');
const CACHE_DURATION_DAYS = 30;

export const getArtistData = async (mbid: string) => {
    const cacheFilePath = path.join(CACHE_DIR, `${mbid}.json`);

    // Try to load from cache first
    const cachedData = loadFromCache(cacheFilePath, CACHE_DURATION_DAYS);
    if (cachedData && "mbid" in cachedData) {
        console.log('Returning cached last.fm artist data');
        return cachedData;
    }

    console.log('Fetching fresh last.fm artist data from API...');

    try {
        const res = await axios.get(`${BASE_URL}${mbid}${URL_CONFIG}`);
        const data = res.data.artist;
        const artistData: LastFMArtistJSON = {
            name: data.name,
            mbid: data.mbid,
            image: data.image.map((img: {'#text': string, size: string}) => {
                return {link: img['#text'], size: img.size};
            }),
            ontour: parseInt(data.ontour) === 1,
            stats: {listeners: parseInt(data.stats.listeners), playcount: parseInt(data.stats.playcount)},
            bio: {link: data.bio.links.link.href, summary: data.bio.summary, content: data.bio.content},
            similar: data.similar.artist.map((a: {name: string}) => a.name),
            date: new Date().toISOString()
        }

        saveToCache(cacheFilePath, artistData, CACHE_DIR);
        console.log(`Last.fm artist data saved to cache.`)

        return artistData;
    } catch (error) {
        console.error('Error fetching artist data:', error);
        throw error;
    }
}