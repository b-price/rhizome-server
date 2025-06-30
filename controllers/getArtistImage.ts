import axios from "axios";

const USER_AGENT = `${process.env.APP_NAME}/${process.env.APP_VERSION} ( ${process.env.APP_CONTACT} )`;
const BASE_URL = `${process.env.MB_URL}artist/`;
const RELS = '?inc=url-rels';

export const getArtistImage = async (mbid: string) => {
    try {
        const res = await axios.get(`${BASE_URL}${mbid}${RELS}`, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
            },
        });
        let image;
        if (res.data.relations) {
            image = res.data.relations.find((r: { type: string; }) => r.type === 'image')?.url.resource;
            if (image.startsWith('https://commons.wikimedia.org/wiki/File:')) {
                const filename = image.substring(image.lastIndexOf('/') + 1);
                image = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/' + filename;
            }
        }
        return image;
    } catch (error) {
        console.error(`Error fetching image for artist ${mbid}:`, error);
        throw error;
    }
}