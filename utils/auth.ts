import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { createAuthMiddleware } from "better-auth/api";
import {authDB} from "../db/connection";
import {createUserData} from "../controllers/writeToDB";
import {FRONTEND_DEPLOYMENT_URL} from "./defaults";
import {getUserData} from "../controllers/getFromDB";

export const auth = () => betterAuth({
    database: authDB.db ? mongodbAdapter(authDB.db) : undefined,
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_OAUTH_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET as string,
        },
    },
    user: {
        changeEmail: {
            enabled: true,
        },
        deleteUser: {
            enabled: true
        }
    },
    trustedOrigins: ['http://localhost:5173', FRONTEND_DEPLOYMENT_URL],
    hooks: {
        after: createAuthMiddleware(async (ctx) => {
            if (ctx.path.startsWith("/sign-up")) {
                const newSession = ctx.context.newSession;
                if (newSession) {
                    await createUserData(newSession.user.id);
                }
            }
            if (ctx.path.startsWith("/sign-in/social")) {
                console.log(ctx)
                const newSession = ctx.context.newSession;
                if (newSession) {
                    console.log('new session')
                    const user = await getUserData(newSession.user.id);
                    if (!user) {
                        console.log('creating new user')
                        await createUserData(newSession.user.id);
                    }
                }
            }
            //TODO: Delete user data

        }),
    }
});