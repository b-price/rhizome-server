import express from "express";
import axios from "axios";
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

router.get('/lastfm/recenttracks/:username', async (req, res) => {
    const { username } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const apiKey = process.env.LASTFM_API_KEY;
    if (!apiKey) {
        res.status(503).json({ error: 'Last.fm not configured' });
        return;
    }
    try {
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${apiKey}&format=json&limit=${limit}`;
        const { data } = await axios.get(url);
        const raw: any[] = data?.recenttracks?.track ?? [];
        const tracks = raw
            .filter((t) => t?.name && t?.artist?.['#text'])
            .map((t) => ({
                name: t.name,
                artist: t.artist['#text'],
                album: t.album?.['#text'] ?? '',
                timestamp: t.date?.uts ? parseInt(t.date.uts, 10) * 1000 : Date.now(),
                nowPlaying: t['@attr']?.nowplaying === 'true',
                imageUrl: t.image?.find((img: any) => img.size === 'medium')?.['#text'] ?? null,
            }));
        res.json({ tracks });
    } catch (err) {
        console.error('Failed to fetch Last.fm recent tracks:', err);
        res.status(500).json({ error: 'Failed to fetch Last.fm data' });
    }
});

export default router;