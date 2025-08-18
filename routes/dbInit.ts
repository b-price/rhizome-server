import express from "express";
import {generateDataset} from "../testrunners/generateInitialDataset";

const router = express.Router();
const password = process.env.DB_INIT_PASSWORD;

router.get('/:password', async (req, res) => {
    try {
        if (req.params.password !== password) throw new Error("Invalid Password");
        await generateDataset();
    } catch (err) {
        console.error('Failed to initialize DB:', err);
        res.status(500).json({ error: 'Failed to initialize DB' });
    }
});

export default router;