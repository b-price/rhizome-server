import nodemailer from 'nodemailer';
import {ADMIN_EMAIL} from "./defaults";

export async function sendEmail(email: { to: string, from: string, subject: string, text?: string, html?: string }) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: ADMIN_EMAIL,
            clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
            clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
            refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
        }
    });
    return await transporter.sendMail(email);
}