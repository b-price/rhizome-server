import {frontend_url} from "./urls";

const credentials = true;
const origin = frontend_url;
const methods = ["GET", "POST", "PUT", "DELETE"];

export const corsOptions = {
    credentials,
    origin,
    methods,
}