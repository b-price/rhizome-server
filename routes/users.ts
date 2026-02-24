import express from "express";
import {getUserData, verifyAccessCode} from "../controllers/getFromDB";
import {
    addLFMtoUser,
    addUserLikedArtist,
    removeUserLikedArtist,
    submitFeedback,
    updateUserPreferences
} from "../controllers/writeToDB";
import {getLFMAuthUrl, lastfmAuthHandler} from "../controllers/lastfmAuth";

const router = express.Router();

export const LFM_USER_SESSION_ENDPOINT = '/lastfm/user/session'

router.get('/:id', async (req, res) => {
    try {
        const user = await getUserData(req.params.id);
        res.json(user);
    } catch (err) {
        console.error('Failed to fetch user:', err);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

router.get('/verify-access-code/:code/:email', async (req, res) => {
    try {
        const verified = await verifyAccessCode(req.params.code, req.params.email);
        if (verified) {
            res.status(200).end();
        } else {
            res.status(401).json({error: 'Invalid access code'});
        }
    } catch (err) {
        res.status(500).json({error: 'Failed to verify access code'});
    }
});

router.get('/lastfm/authurl', async (req, res) => {
    try {
        const url = getLFMAuthUrl();
        res.status(200).json({ url });
    } catch (err) {
        console.error('Failed to generate last.fm auth url:', err);
        res.status(500).json({ error: 'Failed to generate last.fm auth url' });
    }
});

router.get(`${LFM_USER_SESSION_ENDPOINT}`, async (req, res) => {
    try {
        if (!req.query.token) {
            res.status(400).end();
        } else {
            const lfmUserSession = await lastfmAuthHandler(req.query.token.toString());
            res.status(200).json(lfmUserSession);
        }

    } catch (err) {
        console.error('Failed to fetch last.fm user session:', err);
        res.status(500).json({ error: 'Failed to fetch last.fm user session' });
    }
});

router.post('/feedback', async (req, res) => {
    try {
        if (!req.body.feedback) {
            throw new Error('Invalid feedback format');
        }
        await submitFeedback(req.body.feedback);
        res.status(200).json({ message: 'Submitted feedback.' });
    } catch (err) {
        console.error('Failed to submit feedback:', err);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

router.put('/like/:userID/:artistID', async (req, res) => {
    try {
        await addUserLikedArtist(req.params.userID, req.params.artistID);
        res.status(200).end();
    } catch (err) {
        console.error('Failed to like artist:', err);
        res.status(500).json({ error: 'Failed to like artist' });
    }
});

router.put('/unlike/:userID/:artistID', async (req, res) => {
    try {
        await removeUserLikedArtist(req.params.userID, req.params.artistID);
        res.status(200).end();
    } catch (err) {
        console.error('Failed to unlike artist:', err);
        res.status(500).json({ error: 'Failed to unlike artist' });
    }
});

router.put('/preferences', async (req, res) => {
    try {
        const data = req.body.data;
        if (!data || !('id' in data) || !('preferences' in data)) {
            throw new Error('Invalid user data');
        }
        await updateUserPreferences(data.id, data.preferences);
        res.status(200).end();
    } catch (err) {
        console.error('Failed to update user preferences:', err);
        res.status(500).json({ error: 'Failed to update user preferences' });
    }
});

router.put('/lastfm/:userID/:lfmusername', async (req, res) => {
    try {
        await addLFMtoUser(req.params.userID, req.params.lfmusername);
        res.status(200).end();
    } catch (err) {
        console.error('Failed to connect last.fm:', err);
        res.status(500).json({ error: `Failed to connect last.fm: ${err}` });
    }
});

export default router;