import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import {authDB} from "../db/connection";
import {createUserData, deleteUserData} from "../controllers/writeToDB";
import {ADMIN_EMAIL} from "./defaults";
import {sendEmail} from "./email";
import {FRONTEND_DEPLOYMENT_URL, FRONTEND_LOCALHOST, ngrokUrl, serverUrl} from "./urls";

export const auth = () => betterAuth({
    database: authDB.db ? mongodbAdapter(authDB.db) : undefined,
    appName: 'Rhizome',
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        sendResetPassword: async ({ user, url, token }, request) => {
            await sendEmail({
                to: user.email,
                from: ADMIN_EMAIL,
                subject: 'Reset your Rhizome password',
                text: `Click the link to reset your password: ${url}. \nIf this wasn't you, you can safely ignore this email.`
            });
        },
        // onPasswordReset: async ({ user }, request) => {
        //     console.log(`Password for user ${user.email} has been reset.`);
        // },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_OAUTH_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET as string,
            redirectURI: `${serverUrl}/api/auth/callback/google`,
        },
        spotify: {
            clientId: process.env.SPOTIFY_CLIENT_ID as string,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
            redirectURI: `${ngrokUrl}/api/auth/callback/spotify`,
        },
    },
    user: {
        changeEmail: {
            enabled: true,
        },
        deleteUser: {
            enabled: true,
            sendDeleteAccountVerification: async (
                {
                    user,   // The user object
                    url, // The auto-generated URL for deletion
                    token  // The verification token  (can be used to generate custom URL)
                },
                request  // The original request object (optional)
            ) => {
                await sendEmail({
                    to: user.email,
                    from: ADMIN_EMAIL,
                    subject: 'Confirm your Rhizome account deletion',
                    text: `Click the link to permanently delete your account (no going back!): ${url}`
                })
            },
            afterDelete: async (user, request) => {
                await deleteUserData(user.id);
            }
        }
    },
    trustedOrigins: [FRONTEND_LOCALHOST, FRONTEND_DEPLOYMENT_URL],
    databaseHooks: {
        user: {
            create: {
                after: async (user, ctx) => {
                    const isSocial = !!(ctx && ctx.params && ctx.params.id);
                    //console.log(`trying to create ${JSON.stringify(user, null, 4)} with context ${JSON.stringify(ctx, null, 4)}`);
                    console.log(`creating user...`)
                    await createUserData(user.id, isSocial);
                }
            },
        },
    },
    advanced: {
        //useSecureCookies: true,
        cookiePrefix: "rhizome",
        cookies: {
            session_token: {
                attributes: {
                    sameSite: "none",
                    secure: true,
                    httpOnly: true,
                }
            },
            state: {
                attributes: {
                    sameSite: "none",
                    secure: true,
                }
            }
        }
    },
});