import express from "express";
import {
    getArtistByName,
    getGenreArtistData, getNoParentGenreArtists, getParentOnlyArtists,
    getSimilarArtistsFromArtist
} from "../controllers/getFromDB";
import {flagBadDataArtist} from "../controllers/writeToDB";
import { memoryUsage } from "node:process"
import {ParentField, LinkType} from "../types";

const router = express.Router();

router.get('/:genreID', async (req, res) => {
    try {
        // const startMem = memoryUsage.rss();
        // const startTime = Date.now();
        const artistData = await getGenreArtistData(req.params.genreID);
        // const finishMem = memoryUsage.rss();
        // const endTime = Date.now();
        // console.log(`Total time: ${endTime - startTime} for ${artistData.artists ? artistData.artists.length : 0} artists`);
        // console.log(`Memory usage: ${finishMem - startMem}`)
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

router.get('/parentonly/:genreID/:linktype', async (req, res) => {
    try {
        const parentOnlyArtists = await getParentOnlyArtists(req.params.genreID, req.params.linktype as ParentField);
        res.json(parentOnlyArtists);
    } catch (err) {
        console.error('Failed to fetch parent-only artists:', err);
        res.status(500).json({ error: 'Failed to fetch parent-only artists' });
    }
});

router.get('/noparent/:genreID/:linktype', async (req, res) => {
    try {
        const noParentArtists = await getNoParentGenreArtists(req.params.genreID, req.params.linktype as ParentField);
        res.json(noParentArtists);
    } catch (err) {
        console.error('Failed to fetch parent-only artists:', err);
        res.status(500).json({ error: 'Failed to fetch parent-only artists' });
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

export default router;