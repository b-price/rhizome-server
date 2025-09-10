import express from "express";
import {
    getArtistByName, getArtistDataFiltered, getDuplicateArtists,
    getGenreArtistData, getMultipleGenresArtistsData, getNoParentGenreArtists, getParentOnlyArtists,
    getSimilarArtistsFromArtist, getTopArtists
} from "../controllers/getFromDB";
import {flipBadDataArtist, submitBadDataReport} from "../controllers/writeToDB";
import { memoryUsage } from "node:process"
import {ParentField, LinkType, FilterField} from "../types";

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

router.get('/:filter/:amount', async (req, res) => {
    try {
        if (!req.params.filter || !req.params.amount || parseInt(req.params.amount) < 1) {
            throw new Error('Invalid parameter')
        }
        const artistData = await getArtistDataFiltered(req.params.filter as FilterField, parseInt(req.params.amount));
        res.json(artistData);
    } catch (err) {
        console.error('Failed to fetch artists:', err);
        res.status(500).json({ error: 'Failed to fetch artists' });
    }
})

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

router.get('/top/:genreID/:amount', async (req, res) => {
    try {
        const topArtists = await getTopArtists(req.params.genreID, parseInt(req.params.amount));
        res.json(topArtists);
    } catch (err) {
        console.error('Failed to fetch top artists:', err);
        res.status(500).json({ error: 'Failed to fetch top artists' });
    }
});

router.get('/duplicates/all/dupes', async (req, res) => {
    try {
        const dupes = await getDuplicateArtists();
        if (dupes) {
            const dupeSet = new Set(dupes.map(d => d.id))
            res.json(Array.from(dupeSet));
        }
        res.end();
    } catch (err) {
        console.error('Failed to fetch duplicate artists:', err);
        res.status(500).json({ error: 'Failed to fetch duplicate artists' });
    }
})

router.post('/:filter/:amount', async (req, res) => {
    try {
        const genres = req.body.genres;
        if (!req.params.filter || !req.params.amount || parseInt(req.params.amount) < 1 || !genres || !genres.length) {
            throw new Error('Invalid parameter')
        }
        const artistData = await getMultipleGenresArtistsData(req.params.filter as FilterField, parseInt(req.params.amount), genres);
        res.json(artistData);
    } catch (err) {
        console.error('Failed to fetch artists from genres:', err);
        res.status(500).json({ error: 'Failed to fetch artists from genres' });
    }
});

router.post('/baddata/report/submit', async (req, res) => {
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

router.put('/bdflag/:id/:reason', async (req, res) => {
    try {
        await flipBadDataArtist(req.params.id, req.params.reason);
        res.status(200).json({ message: 'Updated bad data flag' });
    } catch (err) {
        console.error('Failed to update bad data flag:', err);
        res.status(500).json({ error: 'Failed to update bad data flag' });
    }
});

export default router;