import express from "express";
import {writeAccessCodes} from "../controllers/writeToDB";
import {
    ACCESS_CODES_EMAIL_POST_CODE,
    ACCESS_CODES_EMAIL_POST_CODE_HTML,
    ACCESS_CODES_EMAIL_PRE_CODE,
    ACCESS_CODES_EMAIL_SUBJECT,
    ADMIN_EMAIL,
    APP_NAME
} from "../utils/defaults";
import {sendAccessEmails} from "../utils/accessEmails";
import {removeAccessCodesByEmail, removeAccessCodesByPhase, removeAccessCodesByVersion} from "../controllers/getFromDB";

const router = express.Router();

router.post('/generate-codes', async (req, res) => {
    if (!req.body) {
        res.status(400).json({error: 'JSON body required'});
        return;
    }
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        res.status(403).json({error: 'Invalid password'});
        return;
    }
    if (!req.body.emails) {
        res.status(400).json({error: 'Email address list "emails" required'});
        return;
    }
    if (!req.body.phase) {
        res.status(400).json({error: 'App phase "phase" required'});
        return;
    }
    if (!req.body.version) {
        res.status(400).json({error: 'App version "version" required'});
        return;
    }
    try {
        await writeAccessCodes(req.body.emails, req.body.phase, req.body.version);
        res.status(200).end();
    } catch (err) {
        res.status(500).json({error: 'Failed to write access codes'});
    }
});

router.post('/send-access-emails', async (req, res) => {
    if (!req.body) {
        res.status(400).json({error: 'JSON body required'});
        return;
    }
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        res.status(403).json({error: 'Invalid password'});
        return;
    }
    try {
        const sendees = await sendAccessEmails(
            req.body.from ?? ADMIN_EMAIL,
            req.body.fromName ?? APP_NAME,
            req.body.subject ?? ACCESS_CODES_EMAIL_SUBJECT,
            req.body.bodyPreCode ?? ACCESS_CODES_EMAIL_PRE_CODE,
            req.body.bodyPostCode ?? ACCESS_CODES_EMAIL_POST_CODE,
            req.body.phase,
            req.body.version,
            req.body.emails,
        );
        res.status(200).json(`Successfully sent access code emails to ${sendees}`);
    } catch (err) {
        res.status(500).json({error: 'Failed to send access code emails:', err});
    }
});

router.post('/generate-access-codes-and-send', async (req, res) => {
    if (!req.body) {
        res.status(400).json({error: 'JSON body required'});
        return;
    }
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        res.status(403).json({error: 'Invalid password'});
        return;
    }
    if (!req.body.emails) {
        res.status(400).json({error: 'Email address list "emails" required'});
        return;
    }
    if (!req.body.phase) {
        res.status(400).json({error: 'App phase "phase" required'});
        return;
    }
    if (!req.body.version) {
        res.status(400).json({error: 'App version "version" required'});
        return;
    }
    try {
        await writeAccessCodes(req.body.emails, req.body.phase, req.body.version);
        console.log('Wrote access codes.');
        const sendees = await sendAccessEmails(
            req.body.from ?? ADMIN_EMAIL,
            req.body.fromName ?? APP_NAME,
            req.body.subject ?? ACCESS_CODES_EMAIL_SUBJECT,
            req.body.bodyPreCode ?? ACCESS_CODES_EMAIL_PRE_CODE,
            req.body.bodyPostCode ?? ACCESS_CODES_EMAIL_POST_CODE,
            req.body.phase,
            req.body.version,
            req.body.emails,
        );
        res.status(200).json(`Successfully generated and sent access code emails to ${sendees}`);
    } catch (err) {
        res.status(500).json({error: 'Failed to send access codes:', err});
    }
});

router.delete('/delete-codes-phase', async (req, res) => {
    if (!req.body) {
        res.status(400).json({error: 'JSON body required'});
        return;
    }
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        res.status(403).json({error: 'Invalid password'});
        return;
    }
    try {
        await removeAccessCodesByPhase(req.body.phase);
        res.status(200).json('Successfully removed access codes')
    } catch (err) {
        res.status(500).json({error: 'Failed to remove access codes'});
    }
});

router.delete('/delete-codes-version', async (req, res) => {
    if (!req.body) {
        res.status(400).json({error: 'JSON body required'});
        return;
    }
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        res.status(403).json({error: 'Invalid password'});
        return;
    }
    try {
        await removeAccessCodesByVersion(req.body.version);
        res.status(200).json('Successfully removed access codes')
    } catch (err) {
        res.status(500).json({error: 'Failed to remove access codes'});
    }
});

router.delete('/delete-codes-email', async (req, res) => {
    if (!req.body) {
        res.status(400).json({error: 'JSON body required'});
        return;
    }
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        res.status(403).json({error: 'Invalid password'});
        return;
    }
    try {
        await removeAccessCodesByEmail(req.body.emails);
        res.status(200).json('Successfully removed access codes')
    } catch (err) {
        res.status(500).json({error: 'Failed to remove access codes'});
    }
});

export default router;