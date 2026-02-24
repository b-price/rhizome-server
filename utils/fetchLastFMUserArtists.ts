import axios from "axios";

const BASE_URL = `${process.env.LASTFM_URL}?method=library.getartists&user=`;
const URL_CONFIG = `&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=`;

export async function fetchLastFMUserArtists(lfmUsername: string, limitPerPage = 200, pageLimit = 0) {
    try {
        const firstResponse = await axios.get(`${BASE_URL}${lfmUsername}${URL_CONFIG}${limitPerPage}`);
        const artists = firstResponse.data.artists.artist.map((artist: { mbid: string; name: string; playcount: string; }) => {
            return { id: artist.mbid, name: artist.name, playcount: parseInt(artist.playcount), date: new Date };
        });
        let page = 1;
        const totalArtists = firstResponse.data.artists["@attr"].total;
        const pageCount = pageLimit ? pageLimit : firstResponse.data.artists["@attr"].totalPages;
        while (page < pageCount) {
            page++;
            const response = await axios.get(`${BASE_URL}${lfmUsername}${URL_CONFIG}${limitPerPage}&page=${page}`);
            for (const artist of response.data.artists.artist) {
                artists.push({ id: artist.mbid, name: artist.name, playcount: parseInt(artist.playcount), date: new Date });
            }
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
            artistNames.push(rawArtists.artists[i].name);
        }
        totalArtists = rawArtists.totalArtists;
    }
    return { lfmUsername, topArtists: artistNames, totalArtists };
}