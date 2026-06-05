import axios from "axios";

const USER_AGENT = `${process.env.APP_NAME}/${process.env.APP_VERSION} ( ${process.env.APP_CONTACT} )`;
const BASE_URL = `${process.env.MB_URL}`;

export const mbLookup = async (mbid: string, entityType: string) => {
    try {
        const res = await axios.get(`${BASE_URL}${entityType}/${mbid}`, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
            },
        });
        return res.data;
    } catch (error) {
        console.error(`Error fetching ${entityType} with mbid ${mbid}:`, error);
        throw error;
    }
}