export const SERVER_PROD_URL = 'https://api.rhizome.fyi';
export const SERVER_DEV_URL = 'https://api.dev.rhizome.fyi';

export const serverUrl = process.env.SERVER === 'production'
    ? process.env.CLIENT === 'production'
        ? SERVER_PROD_URL : SERVER_DEV_URL
    : 'http://localhost:3000';

export const spotifyServerUrl = process.env.SERVER === 'production'
    ? process.env.CLIENT === 'production' ? SERVER_PROD_URL : SERVER_DEV_URL
    : 'https://sinuous-unconstantly-dede.ngrok-free.dev';

export const FRONTEND_DEPLOYMENT_URL = 'https://www.rhizome.fyi';
export const FRONTEND_LOCALHOST = 'http://localhost:5173';
export const FRONTEND_PREVIEW_REGEX = /https:\/\/(rizhome|rhizome)-[a-zA-Z0-9-_]+-chonathons-projects.vercel.app/;
export const FRONTEND_LOCAL_IP_REGEX = /http:\/\/192.168.[0-9]{1,3}.[0-9]{1,3}:5173/;
export const BETTER_AUTH_PREVIEWS_WILDCARD = 'https://*.vercel.app';
export const BETTER_AUTH_LOCAL_IP_WILDCARD = 'http://192.168.*.*:5173';
export const allowedTestingOrigins = [FRONTEND_LOCALHOST, FRONTEND_PREVIEW_REGEX];

export const frontend_url = process.env.CLIENT === 'production' ? FRONTEND_DEPLOYMENT_URL
    : allowedTestingOrigins;