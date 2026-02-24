import express from "express";
import {
    getArtistByName,
    getArtistDataFiltered,
    getArtistFromID,
    getDuplicateArtists, getDuplicateArtistsNames,
    getGenreArtistData,
    getMultipleArtists,
    getMultipleGenresArtistsData,
    getNoParentGenreArtists,
    getParentOnlyArtists,
    getRelatedGenresArtists,
    getSimilarArtistsFromArtist,
    getTopArtists, matchArtistNameInDB
} from "../controllers/getFromDB";
import {flipBadDataArtist, submitBadDataReport, updateArtistTopTracks} from "../controllers/writeToDB";
import { memoryUsage } from "node:process"
import {ParentField, LinkType, FilterField} from "../types";
import {topTrackArtists, topTracksArtist} from "../controllers/lastFMTopTracks";

const router = express.Router();

// GET

// Fetches all artists of the genre
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

// Fetch single artist by mbid
router.get('/fetch/id/:id', async (req, res) => {
    try {
        const artist = await getArtistFromID(req.params.id);
        res.json(artist);
    } catch (err) {
        console.error('Failed to fetch artist:', err);
        res.status(500).json({ error: 'Failed to fetch artist' });
    }
});

// Fetch all artists sorted by an attribute within the limit
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

// Fetch a single artist by name
router.get('/fetch/name/:name', async (req, res) => {
    try {
        const artist = await getArtistByName(req.params.name);
        res.json(artist);
    } catch (err) {
        console.error('Failed to fetch artist:', err);
        res.status(500).json({ error: 'Failed to fetch artist' });
    }
});

// Get the top results of an artist name
router.get('/fetch/matchname/:name', async (req, res) => {
    try {
        const artists = await matchArtistNameInDB(req.params.name);
        res.json(artists);
    } catch (err) {
        console.error('Failed to fetch artist:', err);
        res.status(500).json({ error: 'Failed to fetch artist' });
    }
});

// Fetch full artist data for an artist's similar artists
router.get('/fetch/similar/:id', async (req, res) => {
    try {
        const similarArtists = await getSimilarArtistsFromArtist(req.params.id);
        res.json(similarArtists);
    } catch (err) {
        console.error('Failed to fetch similar artists:', err);
        res.status(500).json({ error: 'Failed to fetch similar artists' });
    }
});

// Updates artist's top tracks (should be put?)
router.get('/toptracks/:id/:name', async (req, res) => {
    try {
        //const start = Date.now();
        const topTracks = await updateArtistTopTracks(req.params.id, req.params.name);
        //const end = Date.now();
        //console.log(`Took ${end - start}ms`)
        res.json(topTracks);
    } catch (err) {
        console.error('Failed to fetch top tracks:', err);
        res.status(500).json({ error: 'Failed to fetch top tracks' });
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

// Fetches the top [amount] artists in the genre
router.get('/top/:genreID/:amount', async (req, res) => {
    try {
        const topArtists = await getTopArtists(req.params.genreID, parseInt(req.params.amount));
        res.json(topArtists);
    } catch (err) {
        console.error('Failed to fetch top artists:', err);
        res.status(500).json({ error: 'Failed to fetch top artists' });
    }
});

// Fetches artists who have the same MBID
router.get('/duplicates/all/mbid', async (req, res) => {
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
});

// Fetches artists who have the same name
router.get('/duplicates/all/name', async (req, res) => {
    try {
        const dupes = await getDuplicateArtistsNames();
        res.json(dupes);
        res.end();
    } catch (err) {
        console.error('Failed to fetch duplicate artists:', err);
        res.status(500).json({ error: 'Failed to fetch duplicate artists' });
    }
});

// POST

// Fetches youtube IDs of the top track of each given artist
router.post('/toptracks/multiple', async (req, res) => {
    try {
        const artists = req.body.artists;
        if (!artists || !artists.length) {
            throw new Error('Invalid parameter')
        }
        const ytIDs = await topTrackArtists(artists);
        res.json(ytIDs);
    } catch (err) {
        console.error('Failed to fetch top tracks of artists:');
        res.status(500).json({ error: 'Failed to fetch top tracks of artists' });
    }
});

// Fetches the artists in [genres] sorted by [filter] up to [amount]
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

// Fetches full artist data and links for the given artist IDs
router.post('/multiple', async (req, res) => {
    try {
        const artists = req.body.artists;
        if (!artists || !artists.length) {
            throw new Error('Invalid artist ID list')
        }
        const artistData = await getMultipleArtists(artists);
        res.json(artistData);
    } catch (err) {
        console.error('Failed to fetch artists from genres:', err);
        res.status(500).json({ error: 'Failed to fetch artists from genres' });
    }
});

// Fetches artists in an artist's related genres (optionally force similar artists with [useSimilar]
router.post('/related-genres', async (req, res) => {
    if (!req.body.filter || !req.body.amount || parseInt(req.body.amount) < 1 || !req.body.artist) {
        console.error('Invalid json body');
        res.status(400).json({ error: 'Invalid json body' });
        return;
    }
    try {
        const artistData = await getRelatedGenresArtists(req.body.artist, req.body.filter as FilterField, parseInt(req.body.amount), req.body.useSimilar);
        res.json(artistData);
    } catch (err) {
        console.error('Failed to fetch artists from related genres:', err);
        res.status(500).json({ error: 'Failed to fetch artists from related genres' });
    }
});

// Fetches the artists in [genres] sorted by [filter] up to [amount]
router.post('/filtered-genres', async (req, res) => {
    const genres = req.body.genres;
    if (!req.body.filter || !req.body.amount || parseInt(req.body.amount) < 1 || !genres || !genres.length) {
        console.error('Invalid json body');
        res.status(400).json({ error: 'Invalid json body' });
        return;
    }
    try {

        const artistData = await getMultipleGenresArtistsData(req.body.filter as FilterField, parseInt(req.body.amount), genres);
        res.json(artistData);
    } catch (err) {
        console.error('Failed to fetch artists from genres:', err);
        res.status(500).json({ error: 'Failed to fetch artists from genres' });
    }
});

// Posts a bad data report for an artist
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

// PUT

// Flip the bad data flag for an artist
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