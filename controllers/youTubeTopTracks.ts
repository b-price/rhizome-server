import axios from "axios";
import {YouTubeTrackData} from "../types";

const MUSIC_YT_CATEGORY = 10;
const BASE_URL = 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=';
const URL_CONFIG = `&safeSearch=none&type=video&videoCategoryId=${MUSIC_YT_CATEGORY}&videoEmbeddable=true&key=${process.env.YOUTUBE_API_KEY}`;

export async function getTopTracksOfArtistYT(artistName: string, additional = '', amount = 5) {
    try {
        const query = additional ? `${artistName} ${additional}` : artistName;
        const res = await axios.get(`${BASE_URL}${amount}&q=${encodeURIComponent(query)}${URL_CONFIG}`);
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

export async function getTopTrackOfArtistYT(artistName: string, trackName: string) {
    try {
        const query = `${artistName} ${trackName}`;
        const res = await axios.get(`${BASE_URL}${1}&q=${encodeURIComponent(query)}${URL_CONFIG}`);
        let data = res.data.items;
        let ytID;

        if (data && data.length) {
            ytID = data[0].id.videoId;
        }
        return ytID;
    } catch (error) {
        console.error('Error retrieving top tracks of artist: ', error);
        throw error;
    }
}
