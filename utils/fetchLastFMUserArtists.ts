import axios from "axios";

const BASE_URL = `${process.env.LASTFM_URL}?method=library.getartists&user=`;
const URL_CONFIG = `&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=`;

export async function fetchLastFMUserArtists(lfmUserId: string, limitPerPage = 200) {
    try {
        const firstResponse = await axios.get(`${BASE_URL}${lfmUserId}${URL_CONFIG}${limitPerPage}`);
        const artists = firstResponse.data.artists.artist.map((artist: { mbid: string; name: string; playcount: string; }) => {
            return { id: artist.mbid, name: artist.name, playcount: parseInt(artist.playcount), date: new Date };
        });
        let page = 1;
        const pageCount = firstResponse.data.artists["@attr"].totalPages;
        while (page < pageCount) {
            page++;
            const response = await axios.get(`${BASE_URL}${lfmUserId}${URL_CONFIG}${limitPerPage}&page=${page}`);
            for (const artist of response.data.artists.artist) {
                artists.push({ id: artist.mbid, name: artist.name, playcount: parseInt(artist.playcount), date: new Date });
            }
        }
        return artists;
    } catch (error) {
        console.error('Error retrieving user artists: ', error);
    }
}