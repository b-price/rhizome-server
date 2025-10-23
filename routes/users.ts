import express from "express";
import {getUserData} from "../controllers/getFromDB";
import {
    addUserLikedArtist,
    removeUserLikedArtist,
    submitFeedback,
    updateUserPreferences
} from "../controllers/writeToDB";

const router = express.Router();

router.get('/:id', async (req, res) => {
    try {
        const user = await getUserData(req.params.id);
        res.json(user);
    } catch (err) {
        console.error('Failed to fetch user:', err);
        res.status(500).json({ error: 'Failed to fetch user' });
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

export default router;