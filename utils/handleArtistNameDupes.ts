import {collections} from "../db/connection";
import axios from "axios";

const LASTFM_URL = `${process.env.LASTFM_URL}?method=artist.getinfo&`;
const URL_CONFIG = `&api_key=${process.env.LASTFM_API_KEY}&format=json`;

export async function processSingleArtistNameDupes(name: string, mbid?: string) {
    if (mbid) {

    } else {
        const artists = await collections.artists?.find({ name: name }).toArray();
        if (artists) {
            const hasLfmIdx: number[] = [];
            for (let i = 0; i < artists.length; i++) {
                if (!artists[i].noMBID) {
                    const lastFMData = await axios.get(`${LASTFM_URL}mbid=${artists[i].id}${URL_CONFIG}`);
                    if (lastFMData && !('error' in lastFMData.data)) {
                        hasLfmIdx.push(i);
                    }
                }
            }
        }
    }
}