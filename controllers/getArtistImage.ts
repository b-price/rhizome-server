import axios from "axios";
import * as dotenv from 'dotenv';
import throttleQueue from "../utils/throttleQueue";

dotenv.config();

const USER_AGENT = `${process.env.APP_NAME}/${process.env.APP_VERSION} ( ${process.env.APP_CONTACT} )`;
const BASE_URL = `${process.env.MB_URL}artist/`;
const DISCOGS_SEARCH_URL = `${process.env.DISCOGS_URL}/database/search?q=`;
const DISCOGS_ARTIST_URL = `${process.env.DISCOGS_URL}artists/`;
const DISCOGS_AUTH = `&key=${process.env.DISCOGS_KEY}&secret=${process.env.DISCOGS_SECRET}`;
const RELS = '?inc=url-rels';

const getDiscogsSearch = async (artistName: string) => {
    let image;
    try {
        const discogsRes = await axios.get(`${DISCOGS_SEARCH_URL}${artistName}${DISCOGS_AUTH}`);
        if (discogsRes.data.results.length > 0) {
            image = discogsRes.data.results[0].coverImage;
        }
    } catch (discogsSearchError) {
        console.log(`No discogs data found for ${artistName}.`)
    }
    return image;
}

export const getArtistImage = async (mbid: string, artistName: string) => {
    try {
        const res = await throttleQueue.enqueue(() => axios.get(`${BASE_URL}${mbid}${RELS}`, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
            },
        }));
        let image;
        //console.log(res.data.relations.map(r => r.type));
        if (res.data.relations) {
            image = res.data.relations.find((r: { type: string; }) => r.type === 'image')?.url.resource;
            // if (image && image.startsWith('https://commons.wikimedia.org/wiki/File:')) {
            //     const filename = image.substring(image.lastIndexOf('/') + 1);
            //     image = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/' + filename;
            // }
            if (!image) {
                console.log(`No wiki image for artist ${artistName}, trying discogs...`);
                const discogs = res.data.relations.find((r: { type: string; }) => r.type === 'discogs')?.url.resource;
                if (discogs) {
                    const discogsSplit = discogs.split('/');
                    const dID = discogsSplit[discogsSplit.length - 1];
                    try {
                        const discogsRes = await axios.get(`${DISCOGS_ARTIST_URL}${dID}?user-agent="${USER_AGENT}"${DISCOGS_AUTH}`);
                        image = discogsRes.data.images[0].resource_url;
                    } catch (discogsError) {
                        console.log(`No discogs data found for ${artistName}.`)
                    }
                } else {
                    image = await getDiscogsSearch(artistName);
                }
            }
        } else {
            image = await getDiscogsSearch(artistName);
        }
        if (!image) {
            console.log(`No image could be found for ${artistName}.`);
        }
        return image;
    } catch (error) {
        console.error(`Error fetching artist data for ${artistName}: ${mbid}.`);
        throw error;
    }
}