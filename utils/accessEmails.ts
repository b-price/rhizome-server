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
    const sendees = [];
    for (const code of codeObjects) {
        await sendEmail({
            to: code.userEmail,
            from,
            subject,
            html: `${bodyPreCode}${code.code}${bodyPostCode}`,
            fromName,
        });
        sendees.push(code.userEmail);
    }
    return sendees;
}