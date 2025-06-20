import express from "express";
import {getAllArtists} from "../controllers/artistFetcher";
import {getArtistData} from "../controllers/lastfmArtistData";

const router = express.Router();

router.get('/:genre', async (req, res) => {
    try {
        const artists = await getAllArtists(req.params.genre);
        res.json(artists);
    } catch (err) {
        console.error('Failed to fetch artists:', err);
        res.status(500).json({ error: 'Failed to fetch artists' });
    }
});

router.get('/data/:id', async (req, res) => {
    try {
        const artistData = await getArtistData(req.params.id);
        res.json(artistData);
    } catch (err) {
        console.error('Failed to fetch artist:', err);
        res.status(500).json({ error: 'Failed to fetch artist data' });
    }
})

export default router;