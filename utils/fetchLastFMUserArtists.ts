import axios from "axios";
import {ArtistLike} from "../types";

const BASE_URL_ALL = `${process.env.LASTFM_URL}?method=library.getartists&user=`;
const BASE_URL_WEEKLY = `${process.env.LASTFM_URL}?method=user.getWeeklyArtistChart&user=`;
const URL_CONFIG = `&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=`;

export async function fetchLastFMUserArtists(lfmUsername: string, limitPerPage = 200, pageLimit = 0) {
    try {
        let artists: ArtistLike[] = [];
        const firstResponse = await axios.get(`${BASE_URL_ALL}${lfmUsername}${URL_CONFIG}${limitPerPage}`);
        if (Array.isArray(firstResponse.data.artists.artist)) {
            artists = firstResponse.data.artists.artist.map((artist: { mbid: string; name: string; playcount: string; }) => {
                return { id: artist.mbid, name: artist.name, playcount: parseInt(artist.playcount), date: new Date, lastFM: true };
            });
        } else {
            // Handles when response is only one artist (it's not an array in that case but a single object)
            artists = [{
                id: firstResponse.data.artists.artist.mbid,
                name: firstResponse.data.artists.artist.name,
                playcount: parseInt(firstResponse.data.artists.artist.playcount),
                date: new Date,
                lastFM: true,
            }];
        }

        let page = 1;
        const totalArtists = firstResponse.data.artists["@attr"].total;
        const pageCount = pageLimit ? pageLimit : firstResponse.data.artists["@attr"].totalPages;
        page++;
        while (page <= pageCount) {
            const response = await axios.get(`${BASE_URL_ALL}${lfmUsername}${URL_CONFIG}${limitPerPage}&page=${page}`);
            if (Array.isArray(response.data.artists.artist)) {
                for (const artist of response.data.artists.artist) {
                    artists.push({ id: artist.mbid, name: artist.name, playcount: parseInt(artist.playcount), date: new Date, lastFM: true });
                }
            } else {
                // Handles when response is only one artist (it's not an array in that case but a single object)
                if (response.data.artists.artist) {
                    artists.push({
                        id: response.data.artists.artist.mbid,
                        name: response.data.artists.artist.name,
                        playcount: parseInt(response.data.artists.artist.playcount),
                        date: new Date,
                        lastFM: true,
                    });
                }
            }
            page++;
        }
        return {artists, totalArtists};
    } catch (error) {
        console.error('Error retrieving user artists: ', error);
    }
}

export async function lastFMUserPreview(lfmUsername: string, artistCount = 5) {
    const rawArtists = await fetchLastFMUserArtists(lfmUsername, artistCount, 1);
    const artistNames: string[] = [];
    let totalArtists = 0;
    if (rawArtists && rawArtists.artists.length) {
        for (let i = 0; i < Math.max(rawArtists.artists.length, artistCount); i++) {
            const artistName = rawArtists.artists[i].name;
            if (artistName !== undefined) {
                artistNames.push(artistName);
            }
        }
        totalArtists = rawArtists.totalArtists;
    }
    return { lfmUsername, topArtists: artistNames, totalArtists };
}

export async function fetchRecentLastFMUserArtists(lfmUsername: string, since: number) {
    const now = Math.floor(new Date().getTime() / 1000);
    const response = await axios.get(`${BASE_URL_WEEKLY}${lfmUsername}${URL_CONFIG}&from=${since}&to=${now}`);
    return response.data.weeklyartistchart.artist.map((artist: { mbid: string; name: string; playcount: string; }) => {
        return { id: artist.mbid, name: artist.name, playcount: parseInt(artist.playcount), date: new Date, lastFM: true };
    });
}