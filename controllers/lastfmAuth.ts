import axios from "axios";
import {createHash} from "node:crypto";
import {serverUrl} from "../utils/urls";
import {LFM_USER_SESSION_ENDPOINT} from "../routes/users";

const lfmApiKey = process.env.LASTFM_API_KEY;
const lfmAuthUrl = 'http://www.last.fm/api/auth/';

export function getLFMAuthUrl() {
    const callbackUrl = `${serverUrl}/users${LFM_USER_SESSION_ENDPOINT}`;
    return `${lfmAuthUrl}?api_key=${lfmApiKey}&cb=${callbackUrl}`;
    //const initReq = await axios.get(`${lfmAuthUrl}?api_key=${lfmApiKey}&cb=${callbackUrl}`);
    //return initReq.data;
}

export async function lastfmAuthHandler(token: string) {
    const sigParams = {
        api_key: lfmApiKey,
        method: 'auth.getSession',
        token,
    }
    const apiSig = getLFMApiSig(sigParams);
    console.log(apiSig);
    const session = await axios.get(`${process.env.LASTFM_URL}`,  {params: {
            ...sigParams,
            api_sig: apiSig,
            format: 'json'
        }}
    );
    //console.log(session.data)
    return session.data;
}

// Creates the api signature string required by Last.fm auth api https://www.last.fm/api/authspec#_8-signing-calls
function getLFMApiSig(params: {[key: string]: string | undefined}) {
    let paramString = '';
    for (const [key, value] of Object.entries(params).sort((a, b) => a[0].localeCompare(b[0])) ) {
        paramString += `${key}${value}`;
    }
    paramString += process.env.LASTFM_SECRET;
    console.log(encodeURIComponent(paramString));
    return createHash('md5').update(paramString).digest('hex');
}