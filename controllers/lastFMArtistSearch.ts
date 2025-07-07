import axios from "axios";
import {LastFMSearchArtistData} from "../types";

const BASE_URL = `${process.env.LASTFM_URL}?method=artist.search&artist=`;
const URL_CONFIG = `&api_key=${process.env.LASTFM_API_KEY}&format=json`;

export const lastFMArtistSearch = async (query: string) => {
    try {
        const res = await axios.get(`${BASE_URL}${encodeURIComponent(query)}${URL_CONFIG}`);
        const data = res.data.results.artistmatches.artist ? res.data.results.artistmatches.artist : [];
        const artists: LastFMSearchArtistData[] = [];
        if (data) {
            data.forEach((artist: {mbid: string, name: string, listeners: string}) => {
                artists.push({
                    id: artist.mbid ? artist.mbid : (Math.random() * 1234567).toString(),
                    name: artist.name,
                    listeners: parseInt(artist.listeners),
                });
            });
        }
        return artists;
    } catch (error) {
        console.error('Error searching for artist', error);
        throw error;
    }
}