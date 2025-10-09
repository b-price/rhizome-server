import express from 'express';
import cors from 'cors';
import 'dotenv/config'
import genres from "./routes/genres";
import genreArtists from "./routes/artists";
import search from "./routes/search";
import initializeDB from "./routes/dbInit";
import users from "./routes/users";
import {connectDB} from "./db/connection";
import {auth} from "./utils/auth";
import { toNodeHandler } from "better-auth/node";

const app = express();
const PORT = process.env.PORT || 3000;

// app.all('/api/auth/{*any}', toNodeHandler(auth));
connectDB().then(v => {
    app.all('/api/auth/{*any}', toNodeHandler(auth()));

});

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
}));

app.use('/genres', genres);
app.use('/artists', genreArtists);
app.use('/search', search);
app.use('/initializeDB', initializeDB);
app.use('/users', users);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);

});
