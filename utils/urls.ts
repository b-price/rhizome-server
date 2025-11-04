export const SERVER_PROD_URL = 'https://api.rhizome.fyi';
export const SERVER_DEV_URL = 'https://api.dev.rhizome.fyi';
export const SERVER_MOBILE_DEV_URL = 'https://api.dev.mobile.rhizome.fyi';

export const serverUrl = process.env.SERVER === 'production'
    ? process.env.CLIENT === 'production'
        ? SERVER_PROD_URL : process.env.CLIENT === 'mobiledev'
            ? SERVER_MOBILE_DEV_URL  : SERVER_DEV_URL
    : 'http://localhost:3000';

export const ngrokUrl = process.env.SERVER === 'production'
    ? process.env.CLIENT === 'production' ? SERVER_PROD_URL : SERVER_DEV_URL
    : 'https://sinuous-unconstantly-dede.ngrok-free.dev';

export const FRONTEND_DEPLOYMENT_URL = 'https://www.rhizome.fyi';
export const FRONTEND_LOCALHOST = 'http://localhost:5173';
export const FRONTEND_LOCAL_MOBILE = 'http://192.168.86.242:5173'

export const frontend_url = process.env.CLIENT === 'production' ? FRONTEND_DEPLOYMENT_URL
    : process.env.CLIENT === 'mobiledev' ? FRONTEND_LOCAL_MOBILE : FRONTEND_LOCALHOST;