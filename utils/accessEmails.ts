import {getAccessCodes} from "../controllers/getFromDB";
import {sendEmail} from "./mailjetEmail";

export async function sendAccessEmails(
    from: string,
    fromName: string,
    subject: string,
    bodyPreCode: string,
    bodyPostCode: string,
    phase?: string,
    version?: string,
    emails?: string[]
) {
    if (!phase && !version && (!emails || emails.length < 1)) {
        console.error('No access code parameters provided');
        throw new Error('No access code parameters provided');
    }
    const codeObjects = await getAccessCodes(phase, version, emails);
    if (!codeObjects || !codeObjects.length) {
        console.error('No matching access codes found');
        throw new Error('No matching access codes found');
    }
    const minDelay = 500;
    const sendees = [];
    for (const code of codeObjects) {
        await sendEmail({
            to: code.userEmail,
            from,
            subject: `${subject}${code.userEmail}`,
            html: `${bodyPreCode}${code.code}${bodyPostCode}`,
            fromName,
        });
        sendees.push({ email: code.userEmail, code: code.code });
        // const delay = minDelay * (1 + Math.random());
        // await new Promise(resolve => setTimeout(resolve, delay));
    }
    return sendees;
}