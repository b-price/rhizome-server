import axios from "axios";
import {BasicItem, LastFMTrack, TopTrack} from "../types";
import {scrapeLastFMPlayLink} from "../utils/lastFMPlayLinkScraper";
import {getYoutubeTrackID} from "./youTubeTopTracks";
import {getSpotifyTrackID} from "./spotifyTopTracks";

const BASE_URL = `${process.env.LASTFM_URL}?method=`;
const URL_CONFIG = `&api_key=${process.env.LASTFM_API_KEY}&format=json`;

// Not used (top tracks of each top artist in the genre are used instead)
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

// Uses the Last.fm api to get the top tracks of an artist
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

// Scrapes youtube/spotify/apple music song IDs from last.fm track page if present
async function getTopTracksPlayIDsLFM(trackData: { title: string, artistName: string, lfmUrl: string }[], amount: number) {
    //const start = Date.now();
    const count = Math.min(trackData.length, amount);
    const urls: Promise<TopTrack | undefined>[] = [];
    for (let i = 0; i < count; i++) {
        urls.push(scrapeLastFMPlayLink(trackData[i].title, trackData[i].artistName, trackData[i].lfmUrl));
    }
    //const end = Date.now();
    //console.log(`${end - start}ms.`)
    return await Promise.all(urls).then(playIDs => playIDs.filter(t => t !== undefined));
}

// Attempts to retrieve track IDs of and artist's top tracks for Youtube, Spotify, and Apple Music, first by scraping Last.fm, then by searching using yt/sp apis
export async function topTracksArtist(
    artistID: string,
    artistName: string,
    amount = 5
) {
    const tracks = await getTopTracksOfArtistLFM(artistID, artistName);
    if (!tracks?.length) {
        console.log('       no top tracks found');
        return [];
    }

    const top = tracks.slice(0, amount);

    // Try scraping play IDs from last.fm track pages first
    let tracksIDs: TopTrack[] = await getTopTracksPlayIDsLFM(
        top.map(t => ({ title: t.name, artistName: t.artist.name, lfmUrl: t.url })),
        amount
    );

    if (!tracksIDs?.length) {
        // Fallback: build the list from scratch by searching YT + Spotify in parallel for each track
        console.log('       no links found')
        const results = await Promise.all(
            top.map(async t => {
                const { youtube, spotify } = await fetchPlatforms(artistName, t.name);
                // Only include if at least one platform was found
                return youtube || spotify
                    ? { artistName, title: t.name, youtube, spotify } as TopTrack
                    : undefined;
            })
        );

        tracksIDs = results.filter((x): x is TopTrack => Boolean(x));
    } else {
        // Fill any missing yt/sp ids
        tracksIDs = await fillMissingIDs(tracksIDs);
    }

    return tracksIDs;
}

// Unused
export async function topTrackArtists(artists: BasicItem[], retries = 3) {
    const tracks = await Promise.all(
        artists.map(async artist => {
            //const start = Date.now();
            //let neededBackup = false;
            const artistTracks = await getTopTracksOfArtistLFM(artist.id, artist.name);
            let url = [];
            if (artistTracks.length) {
                const artistName = artist.name;
                const title = artistTracks[0].name;
                url = await getTopTracksPlayIDsLFM(artistTracks.map(t => {
                    return { title: t.name, artistName: t.artist.name, lfmUrl: t.url }
                }), retries);
                if (!url.length) {
                    //neededBackup = true;
                    const backups = await fetchPlatforms(artist.name, artistTracks[0].name);
                    // const ytURL = await getTopTrackOfArtistYT(artist.name, artistTracks[0].name);
                    // if (ytURL) url.push({title: artistTracks[0].name, artistName: artist.name, youtube: ytURL});
                    if (backups.youtube || backups.spotify) {
                        url.push({ title: artistTracks[0].name, artistName: artist.name, youtube: backups.youtube, spotify: backups.spotify });
                    }
                } else {
                    url = await fillMissingIDs([url[0]]);
                }
                return url.length ? url[0] : undefined;
            }
        })
    );
        //const end = Date.now();
        //console.log(`${artist.name} took ${end - start}ms. Needed backup: ${neededBackup}`)
    return tracks;
}

// Searches YT and Spotify in parallel for play IDs
const fetchPlatforms = async (artist: string, title: string) => {
    const [yt, sp] = await Promise.allSettled([
        getYoutubeTrackID(artist, title),
        getSpotifyTrackID(artist, title),
    ]);

    return {
        youtube: yt.status === "fulfilled" ? yt.value : undefined,
        spotify: sp.status === "fulfilled" ? sp.value : undefined,
    };
};

// Fills missing play IDs for an array of TopTracks
const fillMissingIDs = async (tracks: TopTrack[]) => {
    return await Promise.all(
        tracks.map(async track => {
            const needsYT = !track.youtube;
            const needsSP = !track.spotify;

            if (!needsYT && !needsSP) return track;
            if (needsYT) console.log('      missing yt')
            if (needsSP) console.log('      missing sp')
            // Fetch only what’s missing (still runs both concurrently if both missing)
            const [yt, sp] = await Promise.allSettled([
                needsYT ? getYoutubeTrackID(track.artistName, track.title) : Promise.resolve(track.youtube),
                needsSP ? getSpotifyTrackID(track.artistName, track.title) : Promise.resolve(track.spotify),
            ]);

            return {
                ...track,
                youtube: yt.status === "fulfilled" ? yt.value : track.youtube,
                spotify: sp.status === "fulfilled" ? sp.value : track.spotify,
            };
        })
    );
}

// Unused
export async function topTracksGenre(genreName: string, amount = 5) {
    const tracks = await getTopTracksOfGenreLFM(genreName);
    let urls: string[] = [];
    // if (tracks.length) {
    //     urls = await getTopTracksPlayIDs(tracks.map(t => t.url), amount);
    // }
    return urls;
}