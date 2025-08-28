import express from "express";
import {
    getAllGenreData,
    getGenreNameFromID,
    getGenreTreeFromParent
} from "../controllers/getFromDB";
import {flagBadDataGenre} from "../controllers/writeToDB";
import {ParentField} from "../types";

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

router.get('/tree/:genreID/:linktype', async (req, res) => {
    try {
        const genreTree = await getGenreTreeFromParent(req.params.genreID, req.params.linktype as ParentField);
        res.json(genreTree);
    } catch (err) {
        console.error('Failed to fetch genre tree:', err);
        res.status(500).json({ error: 'Failed to fetch genre tree' });
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