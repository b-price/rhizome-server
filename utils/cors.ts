import {frontend_url} from "./urls";

const credentials = frontend_url !== 'mobiledev';
const origin = frontend_url === 'mobiledev' ? '*' : frontend_url;
const methods = ["GET", "POST", "PUT", "DELETE"];

export const corsOptions = {
    credentials,
    origin,
    methods,
}