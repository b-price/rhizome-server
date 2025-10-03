import axios from "axios";

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '049a455769b341fbbe02848f901bfd0b';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || 'c6e558d4cfa84caba2d5596bc12cdee6';
const SPOTIFY_SEARCH_URL = 'https://api.spotify.com/v1/search';
export let spotifyAccessToken: SpotifyAccessToken | undefined = undefined;

interface SpotifyAccessToken {
    access_token: string;
    token_type: string;
    expires_in: number;
    expiry_time: number;
}

/**
 * Searches Spotify for a track, returns its Spotify ID. Handles access token.
 * @param artist
 * @param title
 */
export async function getSpotifyTrackID(artist: string, title: string) {
    if (!spotifyAccessToken || isExpired(spotifyAccessToken.expiry_time)) {
        //console.log('need to fetch Spotify token...');
        await getSpotifyAccessToken();
    }
    let id;
    if (spotifyAccessToken && !isExpired(spotifyAccessToken.expiry_time)) {
        const query = encodeURIComponent(`track:${title} artist:${artist}`);
        const res = await axios.get(`${SPOTIFY_SEARCH_URL}?q=${query}&type=track`, {
            headers: {'Authorization': `${spotifyAccessToken.token_type} ${spotifyAccessToken.access_token}`}
        });
        if (!res || res.status !== 200) {
            if (res.status === 429) {
                console.error('Spotify quota reached or access error.');
                throw new Error('Spotify quota reached or access error.');
            }
            throw new Error('Spotify error.');
        }
        const tracks = res.data.tracks.items;
        if (tracks.length) {
            //console.log(`       fetched new sp link`)
            id = tracks[0].id;
        }
    }
    return id;
}

function getExpiryTime(expiresInSeconds: number) {
    const expiryMs = (expiresInSeconds - 60) * 1000;
    return Date.now() + expiryMs;
}

function isExpired(expiryTime: number) {
    return Date.now() > expiryTime;
}

// Sets global spotifyAccessToken variable
export async function getSpotifyAccessToken() {
    try {
        const tokenRes = await axios.post(
            SPOTIFY_AUTH_URL,
            `grant_type=client_credentials&client_id=${SPOTIFY_CLIENT_ID}&client_secret=${SPOTIFY_CLIENT_SECRET}`,
            { headers: {'Content-Type': 'application/x-www-form-urlencoded'}}
        );
        if (tokenRes && tokenRes.data.access_token) {
            spotifyAccessToken = {
                ...tokenRes.data,
                expiry_time: getExpiryTime(tokenRes.data.expires_in),
            };
        }
    } catch (error) {
        console.error('Error retrieving spotify token: ', error);
    }
}

// if (require.main === module) {
//     getSpotifyLink('sepultura', 'arise')
// }
