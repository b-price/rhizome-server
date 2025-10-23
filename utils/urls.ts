export const serverUrl = process.env.SERVER === 'production'
    ? 'https://rhizome-server-production.up.railway.app'
    : 'http://localhost:3000';

export const ngrokUrl = process.env.SERVER === 'production'
    ? 'https://rhizome-server-production.up.railway.app'
    : 'https://sinuous-unconstantly-dede.ngrok-free.dev';

export const FRONTEND_DEPLOYMENT_URL = 'https://www.rhizome.fyi';
export const FRONTEND_LOCALHOST = 'http://localhost:5173';
