import express from "express";
import {generateDataset} from "../controllers/generateInitialDataset";
import {updateRootGenres} from "../controllers/writeToDB";

const router = express.Router();
const password = process.env.DB_INIT_PASSWORD;

router.get('/:password', async (req, res) => {
    try {
        if (req.params.password !== password) throw new Error("Invalid Password");
        await generateDataset();
        res.status(200).end();
    } catch (err) {
        console.error('Failed to initialize DB:', err);
        res.status(500).json({ error: 'Failed to initialize DB' });
    }
});

router.get('/updateroot/:password', async (req, res) => {
    try {
        if (req.params.password !== password) throw new Error("Invalid Password");
        const response = await updateRootGenres();
        res.status(200).end();
    } catch (err) {
        console.error('Failed to update root genres:', err);
        res.status(500).json({ error: 'Failed to update root genres' });
    }
})

export default router;