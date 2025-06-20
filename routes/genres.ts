import express from "express";
import {getAllGenres} from "../controllers/genreFetcher";

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const genres = await getAllGenres();
        res.json(genres);
    } catch (err) {
        console.error('Failed to fetch genres:', err);
        res.status(500).json({ error: 'Failed to fetch genres' });
    }
});

export default router;