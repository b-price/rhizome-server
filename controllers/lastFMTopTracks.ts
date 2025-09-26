import axios from "axios";
import {BasicItem, LastFMTrack} from "../types";
import {scrapeLastFMYouTubeLink} from "../utils/lastFMYouTubeLinkScraper";
import {getTopTrackOfArtistYT} from "./youTubeTopTracks";

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
        //const start = Date.now();
        //let nameSearch = false;
        const mbidRes = await axios.get(`${BASE_URL}artist.gettoptracks&mbid=${encodeURIComponent(artistID)}${URL_CONFIG}`);
        let data = mbidRes.data.toptracks ? mbidRes.data.toptracks.track : [];
        const tracks: LastFMTrack[] = [];
        if (!data || !data.length) {
            //nameSearch = true;
            const nameRes = await axios.get(`${BASE_URL}artist.gettoptracks&artist=${encodeURIComponent(artistName)}${URL_CONFIG}`);
            if (nameRes && nameRes.data.toptracks) {
                data = nameRes.data.toptracks.track;
            }

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
        //const end = Date.now();
        //console.log(`${artistName} took ${end - start}ms. ${nameSearch ? 'Needed lfm name search.' : ''}`);
        return tracks;
    } catch (error) {
        console.error('Error retrieving top tracks of artist: ', error);
        throw error;
    }
}

async function getTopTracksYouTubeIDs(lfmURLs: string[], amount: number) {
    //const start = Date.now();
    const count = Math.min(lfmURLs.length, amount);
    const urls = [];
    for (let i = 0; i < count; i++) {
        urls.push(scrapeLastFMYouTubeLink(lfmURLs[i]));
    }
    //const end = Date.now();
    //console.log(`${end - start}ms.`)
    return await Promise.all(urls).then(ytIDs => ytIDs.filter(y => y !== undefined).map(t => t.split('v=')[1]));
}

export async function topTracksArtist(artistID: string, artistName: string, amount = 5) {
    const tracks = await getTopTracksOfArtistLFM(artistID, artistName);
    let urls: string[] = [];
    if (tracks.length) {
        urls = await getTopTracksYouTubeIDs(tracks.map(t => t.url), amount);
        if (!urls.length) {
            const ytIDs: string[] = [];
            for (let i = 0; i < Math.min(amount, tracks.length); i++) {
                // const url = getTopTrackOfArtistYT(artistName, tracks[i].name);
                // if (url) urls.push(url);
                getTopTrackOfArtistYT(artistName, tracks[i].name).then(url => url ? ytIDs.push(url) : url);
            }
            Promise.all(ytIDs).then(ids => urls.push(...ids));
        }
    }
    return urls;
}

export async function topTrackArtists(artists: BasicItem[], retries = 3) {
    const tracks = [];
    for (const artist of artists) {
        //const start = Date.now();
        //let neededBackup = false;
        const artistTracks = await getTopTracksOfArtistLFM(artist.id, artist.name);
        let url = [];
        if (artistTracks.length) {
            url = await getTopTracksYouTubeIDs(artistTracks.map(t => t.url), retries);
            if (!url.length) {
                //neededBackup = true;
                const ytURL = await getTopTrackOfArtistYT(artist.name, artistTracks[0].name);
                if (ytURL) url.push(ytURL);
            }
            if (url.length) tracks.push(url[0]);
        }
        //const end = Date.now();
        //console.log(`${artist.name} took ${end - start}ms. Needed backup: ${neededBackup}`)
    }
    return tracks;
}

export async function topTracksGenre(genreName: string, amount = 5) {
    const tracks = await getTopTracksOfGenreLFM(genreName);
    let urls: string[] = [];
    if (tracks.length) {
        urls = await getTopTracksYouTubeIDs(tracks.map(t => t.url), amount);
    }
    return urls;
}