import express from "express";
import {getArtistData} from "../controllers/lastfmArtistData";
import {getArtistImage} from "../controllers/getArtistImage";
import {lastFMArtistSearch} from "../controllers/lastFMArtistSearch";
import {mbArtistSearch} from "../controllers/mbArtistSearch";
import {
    getArtistByName,
    getGenreArtistData,
    getSimilarArtistsFromArtist
} from "../controllers/getFromDB";
import {flagBadDataArtist} from "../controllers/writeToDB";

const router = express.Router();

router.get('/:genreID', async (req, res) => {
    try {
        const artistData = await getGenreArtistData(req.params.genreID);
        res.json(artistData);
    } catch (err) {
        console.error('Failed to fetch artists:', err);
        res.status(500).json({ error: 'Failed to fetch artists' });
    }
});

router.get('/name/:name', async (req, res) => {
    try {
        const artist = getArtistByName(req.params.name);
        res.json(artist);
    } catch (err) {
        console.error('Failed to fetch artist:', err);
        res.status(500).json({ error: 'Failed to fetch artist' });
    }
});

router.get('/similar/:id', async (req, res) => {
    try {
        const similarArtists = await getSimilarArtistsFromArtist(req.params.id);
        res.json(similarArtists);
    } catch (err) {
        console.error('Failed to fetch similar artists:', err);
        res.status(500).json({ error: 'Failed to fetch similar artists' });
    }
});

router.put('/bdflag/:id', async (req, res) => {
    try {
        await flagBadDataArtist(req.params.id);
    } catch (err) {
        console.error('Failed to update bad data flag:', err);
        res.status(500).json({ error: 'Failed to update bad data flag' });
    }
});

//Deprecated

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
        const image = await getArtistImage(req.params.id, req.params.id); // hack, should pass name
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