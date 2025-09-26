import axios, {AxiosError} from "axios";
import {YouTubeTrackData} from "../types";

const YT_KEY = process.env.YOUTUBE_API_KEY;
const YT_KEY_BACKUP = process.env.YOUTUBE_API_KEY_BACKUP;
const YT_KEY_BACKUP_2 = process.env.YOUTUBE_API_KEY_BACKUP_2;
const MUSIC_YT_CATEGORY = 10;
const BASE_URL = 'https://www.googleapis.com/youtube/v3/search?part=id&maxResults=';
const URL_CONFIG = `&safeSearch=none&type=video&videoCategoryId=${MUSIC_YT_CATEGORY}&videoEmbeddable=true&key=`;

export async function getTopTracksOfArtistYT(artistName: string, additional = '', amount = 5) {
    try {
        const query = additional ? `${artistName} ${additional}` : artistName;
        const res = await axios.get(`${BASE_URL}${amount}&q=${encodeURIComponent(query)}${URL_CONFIG}${YT_KEY}`);
        let data = res.data.items;
        const tracks: YouTubeTrackData[] = [];

        if (data && data.length) {
            data.forEach((track: {snippet: {title: string}, id: {videoId: string}}) => {
                tracks.push({
                    videoTitle: track.snippet.title,
                    id: track.id.videoId,
                });
            });
        }
        return tracks;
    } catch (error) {
        console.error('Error retrieving top tracks of artist: ', error);
        throw error;
    }
}

/**
 * Fetch helper that handles axios errors and returns either data or an error status.
 */
async function fetchTopTrack(query: string, apiKey: string) {
    try {
        return await axios.get(`${BASE_URL}1&q=${query}${URL_CONFIG}${apiKey}`);
    } catch (err) {
        const error = err as AxiosError;
        if (error.response) {
            return { status: error.response.status, data: null };
        }
        throw err; // network or unexpected error
    }
}

export async function getTopTrackOfArtistYT(artistName: string, trackName: string) {
    const query = encodeURIComponent(`${artistName} ${trackName}`);
    const keys = [YT_KEY, YT_KEY_BACKUP, YT_KEY_BACKUP_2].filter(Boolean) as string[];

    let res: any = null;
    for (const key of keys) {
        res = await fetchTopTrack(query, key);
        if (res && res.status !== 403) {
            break; // success or a different error (don’t try more keys)
        }
    }

    if (!res || res.status !== 200) {
        throw new Error(`Unable to find top track for ${artistName}.`);
    }

    const data = res.data.items;
    let ytID = "";
    if (data && data.length) {
        ytID = data[0].id.videoId;
    }
    return ytID;
}