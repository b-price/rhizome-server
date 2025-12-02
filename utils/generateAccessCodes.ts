import {AccessCode} from "../types";
import {randomUUID} from "node:crypto";

export function generateAccessCodes(emails: string[], phase: string, version: string) {
    const codes: AccessCode[] = [];
    emails.forEach(email => {
        codes.push({
            userEmail: email,
            phase: phase,
            version: version,
            code: randomUUID(),
        });
    });
    return codes;
}