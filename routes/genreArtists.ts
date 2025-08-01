import express from "express";
import {getAllArtists} from "../controllers/artistFetcher";
import {getArtistData} from "../controllers/lastfmArtistData";
import {getArtistImage} from "../controllers/getArtistImage";
import {lastFMArtistSearch} from "../controllers/lastFMArtistSearch";
import {mbArtistSearch} from "../controllers/mbArtistSearch";

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

router.get('/data/:id/:name', async (req, res) => {
    try {
        const artistData = await getArtistData(req.params.id, req.params.name);
        res.json(artistData);
    } catch (err) {
        console.error('Failed to fetch artist:', err);
        res.status(500).json({ error: 'Failed to fetch artist data' });
    }
});

router.get('/image/:id', async (req, res) => {
    try {
        const image = await getArtistImage(req.params.id);
        res.json(image);
    } catch (err) {
        console.error('Failed to fetch artist image:', err);
        res.status(500).json({ error: 'Failed to fetch artist image' });
    }
});

router.get('/search/:name', async (req, res) => {
    try {
        console.log(req.params.name);
        const artistsData = await lastFMArtistSearch(req.params.name);
        res.json(artistsData);
    } catch (err) {
        console.error('Failed to search artists:', err);
        res.status(500).json({ error: 'Failed to search artists' });
    }
});

router.get('/mb-search/:name', async (req, res) => {
    try {
        console.log(req.params.name);
        const artistsData = await mbArtistSearch(req.params.name);
        res.json(artistsData);
    } catch (err) {
        console.error('Failed to search artists:', err);
        res.status(500).json({ error: 'Failed to search artists' });
    }
});

export default router;