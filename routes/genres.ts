import express from "express";
import {getAllGenres} from "../controllers/genreFetcher";
import {getGenreArtistCounts} from "../controllers/genreArtistCounts";

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const genres = await getAllGenres();
        res.json(genres);
    } catch (err) {
        console.error('Failed to fetch genreArtists:', err);
        res.status(500).json({ error: 'Failed to fetch genreArtists' });
    }
});

router.get('/artist-count', async (req, res) => {
    try {
        const genresArtistsCounts = await getGenreArtistCounts();
        res.json(genresArtistsCounts);
    } catch (err) {
        console.error('Failed to fetch genre artists counts:', err);
        res.status(500).json({ error: 'Failed to fetch genre artists counts' });
    }
});

export default router;