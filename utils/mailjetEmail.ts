import Mailjet from "node-mailjet";

export async function sendEmail(
    email: { to: string, from: string, subject: string, text?: string, html?: string, fromName?: string }
) {
    try {
        const publicKey = process.env.MAILJET_API_KEY;
        const privateKey = process.env.MAILJET_SECRET_KEY;
        if (!publicKey) {
            throw new Error("Missing mailjet api key");
        }
        if (!privateKey) {
            throw new Error("Missing mailjet api secret");
        }
        const mailjet = Mailjet.apiConnect(publicKey, privateKey);
        await mailjet
            .post('send', { version: 'v3.1' })
            .request({
                Messages: [
                    {
                        From: {
                            Email: email.from,
                            Name: email.fromName ?? 'Rhizome',
                        },
                        To: [{
                            Email: email.to,
                        }],
                        Subject: email.subject,
                        TextPart: email.text,
                        HTMLPart: email.html,
                    }
                ]
            })
    } catch (err) {
        console.error(err);
    }
}