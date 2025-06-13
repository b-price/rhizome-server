import express from "express";
import {getAllArtists} from "../controllers/artistFetcher";

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

export default router;