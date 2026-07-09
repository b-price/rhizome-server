import express from "express";
import {searchDB, getRandomNode} from "../controllers/getFromDB";

const router = express.Router();

router.get('/random/node', async (req, res) => {
    try {
        const result = await getRandomNode();
        res.json(result);
    } catch (err) {
        console.error('Failed to get random node:', err);
        res.status(500).json({ error: 'Failed to get random node' });
    }
});

router.get('/:query',async (req, res) => {
    try {
        const results = await searchDB(req.params.query);
        res.json(results);
    } catch (err) {
        console.error('Failed to search:', err);
        res.status(500).json({ error: 'Failed to search' });
    }
});

export default router;