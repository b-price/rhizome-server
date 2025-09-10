import express from "express";
import {
    getAllGenreData,
    getGenreNameFromID, getGenreRootsDoc,
    getGenreTreeFromParent
} from "../controllers/getFromDB";
import {addRootsToGenres, flipBadDataGenre, submitBadDataReport} from "../controllers/writeToDB";
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

router.get('/tree/roots', async (req, res) => {
    try {
        const roots = await getGenreRootsDoc();
        res.json(roots);
    } catch (err) {
        console.error('Failed to fetch genre roots:', err);
        res.status(500).json({ error: 'Failed to fetch genre roots' });
    }
});

router.get('/tree/set', async (req, res) => {
    try {
        await addRootsToGenres();
        res.status(200).end();
    } catch (err) {
        console.error('Failed to add genre roots:', err);
        res.status(500).json({ error: 'Failed to add genre roots' });
    }
});

router.put('/bdflag/:id/:reason', async (req, res) => {
    try {
        await flipBadDataGenre(req.params.id, req.params.reason);
        res.status(200).json({ message: 'Updated bad data flag' });
    } catch (err) {
        console.error('Failed to update bad data flag:', err);
        res.status(500).json({ error: 'Failed to update bad data flag' });
    }
});

router.post('/baddata/report', async (req, res) => {
    try {
        const report = req.body.report;
        if (!report || !('itemID' in report) || !('userID' in report) || !('reason' in report) || !('type' in report)) {
            throw new Error('Invalid report');
        }
        await submitBadDataReport(report);
        res.status(200).json({ message: 'Submitted bad data report' });
    } catch (err) {
        console.error('Failed to submit bad data report:', err);
        res.status(500).json({ error: 'Failed to submit bad data report' });
    }
});

export default router;