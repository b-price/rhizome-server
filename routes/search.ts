import express from "express";
import {searchDB} from "../controllers/getFromDB";

const router = express.Router();

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