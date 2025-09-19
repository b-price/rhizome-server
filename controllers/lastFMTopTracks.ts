import axios from "axios";
import {LastFMTrack} from "../types";
import {scrapeLastFMYouTubeLink} from "../utils/lastFMYouTubeLinkScraper";
import {getTopTrackOfArtistYT, getTopTracksOfArtistYT} from "./youTubeTopTracks";

const BASE_URL = `${process.env.LASTFM_URL}?method=`;
const URL_CONFIG = `&api_key=${process.env.LASTFM_API_KEY}&format=json`;

async function getTopTracksOfGenreLFM(genreName: string) {
    try {
        const res = await axios.get(`${BASE_URL}tag.gettoptracks&tag=${encodeURIComponent(genreName)}${URL_CONFIG}`);
        const data = res.data.tracks.track;
        const tracks: LastFMTrack[] = [];
        if (data && data.length) {
            data.forEach((track: {mbid: string, name: string, duration: number, artist: {name: string, mbid: string}, url: string}) => {
                tracks.push({
                    id: track.mbid,
                    name: track.name,
                    duration: track.duration,
                    url: track.url,
                    artist: {name: track.artist.name, id: track.artist.mbid},
                });
            });
        }
        return tracks;
    } catch (error) {
        console.error('Error retrieving top tracks of genre: ', error);
        throw error;
    }
}

async function getTopTracksOfArtistLFM(artistID: string, artistName: string) {
    try {
        const mbidRes = await axios.get(`${BASE_URL}artist.gettoptracks&mbid=${encodeURIComponent(artistID)}${URL_CONFIG}`);
        let data = mbidRes.data.toptracks ? mbidRes.data.toptracks.track : [];
        const tracks: LastFMTrack[] = [];
        if (!data || !data.length) {
            const nameRes = await axios.get(`${BASE_URL}artist.gettoptracks&artist=${encodeURIComponent(artistName)}${URL_CONFIG}`);
            data = nameRes.data.toptracks.track;
        }
        if (data && data.length) {
            data.forEach((track: {mbid: string, name: string, playcount: number, listeners: number, artist: {name: string, mbid: string}, url: string}) => {
                tracks.push({
                    id: track.mbid,
                    name: track.name,
                    playcount: track.playcount,
                    listeners: track.listeners,
                    url: track.url,
                    artist: {name: track.artist.name, id: track.artist.mbid},
                });
            });
        }
        return tracks;
    } catch (error) {
        console.error('Error retrieving top tracks of artist: ', error);
        throw error;
    }
}

async function getTopTracksYouTubeIDs(lfmURLs: string[], amount: number) {
    const count = Math.min(lfmURLs.length, amount);
    const urls = [];
    for (let i = 0; i < count; i++) {
        const ytURL = await scrapeLastFMYouTubeLink(lfmURLs[i]);
        if (ytURL) urls.push(ytURL.split('v=')[1]);
    }
    return urls;
}

export async function topTracksArtist(artistID: string, artistName: string, amount = 5) {
    const tracks = await getTopTracksOfArtistLFM(artistID, artistName);
    let urls: string[] = [];
    if (tracks.length) {
        urls = await getTopTracksYouTubeIDs(tracks.map(t => t.url), amount);
        if (!urls.length) {
            for (let i = 0; i < Math.min(amount, tracks.length); i++) {
                const url = await getTopTrackOfArtistYT(artistName, tracks[i].name);
                if (url) urls.push(url);
            }
        }
    }
    return urls;
}

export async function topTracksGenre(genreName: string, amount = 5) {
    const tracks = await getTopTracksOfGenreLFM(genreName);
    let urls: string[] = [];
    if (tracks.length) {
        urls = await getTopTracksYouTubeIDs(tracks.map(t => t.url), amount);
    }
    return urls;
}