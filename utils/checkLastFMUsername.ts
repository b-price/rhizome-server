import axios from "axios";

const BASE_URL = `${process.env.LASTFM_URL}?method=user.getinfo&user=`;
const URL_CONFIG = `&api_key=${process.env.LASTFM_API_KEY}&format=json`;

export async function checkLastFMUsername(username: string) {
    try {
        const response = await axios.get(`${BASE_URL}${username}${URL_CONFIG}`);
        return response.data.user;
    } catch (error) {
        console.error('Error retrieving user: ', error);
    }
}