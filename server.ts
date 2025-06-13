import express from 'express';
import cors from 'cors';
import 'dotenv/config'
import { getAllGenres } from './controllers/genreFetcher';
import {getAllArtists} from "./controllers/artistFetcher";
import {createLinks} from "./utils/createLinks";
import genres from "./routes/genres";
import genreArtists from "./routes/genreArtists";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use('/genres', genres);

app.use('/artists', genreArtists);

// app.get('/genres', async (req, res) => {
//     try {
//         const genres = await getAllGenres();
//         res.json(genres);
//     } catch (err) {
//         console.error('Failed to fetch genres:', err);
//         res.status(500).json({ error: 'Failed to fetch genres' });
//     }
// });
//
// app.get('/artists/:genre', async (req, res) => {
//     try {
//         const artists = await getAllArtists(req.params.genre);
//         res.json(artists.allArtists);
//     } catch (err) {
//         console.error('Failed to fetch artists:', err);
//         res.status(500).json({ error: 'Failed to fetch artists' });
//     }
// });
//
// app.get('/artists/connections/:genre', async (req, res) => {
//     try {
//         const artists = await getAllArtists(req.params.genre);
//
//         const links = createLinks(artists.tagMap);
//         res.json(links);
//     } catch (err) {
//         console.error('Failed to fetch artists:', err);
//         res.status(500).json({ error: 'Failed to fetch artists' });
//     }
// });

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
