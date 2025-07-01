import path from "path";
import {loadFromCache, saveToCache} from "../utils/cacheOps";
import axios from "axios";
import {LastFMArtistJSON} from "../types";

const BASE_URL = `${process.env.LASTFM_URL}?method=artist.getinfo&`;
const URL_CONFIG = `&api_key=${process.env.LASTFM_API_KEY}&format=json`;
const CACHE_DIR = path.join(process.cwd(), 'data', 'artists');
const CACHE_DURATION_DAYS = 30;

export const getArtistData = async (mbid: string, artistName: string) => {
    const cacheFilePath = path.join(CACHE_DIR, `${mbid}.json`);

    // Try to load from cache first
    const cachedData = loadFromCache(cacheFilePath, CACHE_DURATION_DAYS);
    if (cachedData && "mbid" in cachedData) {
        console.log('Returning cached last.fm artist data');
        return cachedData;
    }

    console.log('Fetching fresh last.fm artist data from API...');

    // First attempt: try with MBID
    try {
        const res = await axios.get(`${BASE_URL}mbid=${mbid}${URL_CONFIG}`);
        const data = res.data.artist;
        const artistData: LastFMArtistJSON = {
            name: data.name,
            mbid: data.mbid,
            ontour: parseInt(data.ontour) === 1,
            stats: {listeners: parseInt(data.stats.listeners), playcount: parseInt(data.stats.playcount)},
            bio: {
                link: data.bio.links.link.href,
                summary: data.bio.summary.replaceAll(/<.*>/g, ''),
                content: data.bio.content.replaceAll(/<.*>/g, '')
            },
            similar: data.similar.artist.map((a: {name: string}) => a.name),
            date: new Date().toISOString()
        }

        saveToCache(cacheFilePath, artistData, CACHE_DIR);
        console.log(`Last.fm artist data saved to cache.`)

        return artistData;
    } catch (mbidError) {
        console.log(`MBID query failed for ${mbid}, attempting to fetch by artist name: ${artistName}`);

        // Second attempt: try with artist name
        try {
            const res = await axios.get(`${BASE_URL}artist=${encodeURIComponent(artistName)}${URL_CONFIG}`);
            const data = res.data.artist;
            if (data && data.mbid && data.mbid !== mbid) {
                console.log("MBID of returned artist exists and does not match artist")
                throw mbidError;
            }
            const artistData: LastFMArtistJSON = {
                name: data.name,
                mbid: data.mbid,
                ontour: parseInt(data.ontour) === 1,
                stats: {listeners: parseInt(data.stats.listeners), playcount: parseInt(data.stats.playcount)},
                bio: {
                    link: data.bio.links.link.href,
                    summary: data.bio.summary.replaceAll(/<.*>/g, ''),
                    content: data.bio.content.replaceAll(/<.*>/g, '')
                },
                similar: data.similar.artist.map((a: {name: string}) => a.name),
                date: new Date().toISOString()
            }

            saveToCache(cacheFilePath, artistData, CACHE_DIR);
            console.log(`Last.fm artist data fetched by name and saved to cache.`)

            return artistData;
        } catch (nameError) {
            console.error(`Both MBID and name queries failed for artist ${artistName} (${mbid})`);
            console.error('MBID error:', mbidError);
            console.error('Name error:', nameError);
            throw nameError;
        }
    }
}