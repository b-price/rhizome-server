import express from "express";
import {writeAccessCodes} from "../controllers/writeToDB";

const router = express.Router();

router.get('/codes/:phase/:version', async (req, res) => {

});

router.post('/generate-codes', async (req, res) => {
    if (!req.body) {
        res.status(400).json({error: 'JSON body required'});
    }
    if (!req.body.emails) {
        res.status(400).json({error: 'Email address list "emails" required'});
    }
    if (!req.body.phase) {
        res.status(400).json({error: 'App phase "phase" required'});
    }
    if (!req.body.version) {
        res.status(400).json({error: 'App version "version" required'});
    }
    try {
        await writeAccessCodes(req.body.emails, req.body.phase, req.body.version);
        res.status(200).end();
    } catch (err) {
        res.status(500).json({error: 'Failed to write access codes'});
    }
});

router.post('/send-emails', async (req, res) => {

});

export default router;