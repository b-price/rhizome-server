import express from "express";
import {getAllGenreData, getAllGenresFromDB, getGenreNameFromID} from "../controllers/getFromDB";
import {flagBadDataGenre} from "../controllers/writeToDB";

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const genreData = await getAllGenreData();
        res.json(genreData);
    } catch (err) {
        console.error('Failed to fetch genres:', err);
        res.status(500).json({ error: 'Failed to fetch genres' });
    }
});

router.get('/:genreID', async (req, res) => {
    try {
        const genre = await getGenreNameFromID(req.params.genreID);
        res.json(genre);
    } catch (err) {
        console.error('Failed to fetch genre:', err);
        res.status(500).json({ error: 'Failed to fetch genre' });
    }
});

router.put('/bdflag/:id', async (req, res) => {
    try {
        await flagBadDataGenre(req.params.id);
        res.status(200).json({ message: 'Updated bad data flag' });
    } catch (err) {
        console.error('Failed to update bad data flag:', err);
        res.status(500).json({ error: 'Failed to update bad data flag' });
    }
});

export default router;