import express from "express";
import {generateDataset} from "../controllers/generateInitialDataset";
import {addTopArtistsToGenres, addTopTracksToAllGenreTopArtists, updateRootGenres} from "../controllers/writeToDB";

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
});

router.get('/updatetop/:password', async (req, res) => {
    try {
        if (req.params.password !== password) throw new Error("Invalid Password");
        const response = await addTopArtistsToGenres();
        res.status(200).end();
    } catch (err) {
        console.error('Failed to update top artists for all genres:', err);
        res.status(500).json({ error: 'Failed to update top artists for all genres' });
    }
});

router.get('/genretoptracks/:password', async (req, res) => {
    try {
        if (req.params.password !== password) throw new Error("Invalid Password");
        const response = await addTopTracksToAllGenreTopArtists();
        res.status(200).end();
    } catch (err) {
        console.error('Failed to update top tracks for all genre top artists:', err);
        res.status(500).json({ error: 'Failed to update top tracks for all genre top artists' });
    }
});

export default router;