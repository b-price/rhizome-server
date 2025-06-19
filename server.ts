import express from 'express';
import cors from 'cors';
import 'dotenv/config'
import genres from "./routes/genres";
import genreArtists from "./routes/genreArtists";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use('/genres', genres);

app.use('/artists', genreArtists);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
