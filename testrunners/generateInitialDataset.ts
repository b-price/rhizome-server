import path from "path";
import axios from "axios";
import {Artist, ArtistData, ArtistJSON, ArtistResponse, Genre} from "../types";
import throttleQueue from "../utils/throttleQueue";
import {fetchGenres, GenreResponse} from "../controllers/genreFetcher";
import {createArtistLinks} from "../utils/createArtistLinks";
import {saveToCache} from "../utils/cacheOps";
import {getArtistImage} from "../controllers/getArtistImage";
import {scrapeGenres, scrapeSingle} from "../utils/mbGenresScraper";

const USER_AGENT = `${process.env.APP_NAME}/${process.env.APP_VERSION} ( ${process.env.APP_CONTACT} )`;
const GENRES_URL = `${process.env.MB_URL}genre/all`;
const ARTISTS_URL = `${process.env.MB_URL}artist`;
const LASTFM_URL = `${process.env.LASTFM_URL}?method=artist.getinfo&`;
const LASTFM_TAG_URL = `${process.env.LASTFM_URL}?method=tag.getTopArtists&tag=`;
const URL_CONFIG = `&api_key=${process.env.LASTFM_API_KEY}&format=json`;
const EXCLUDED = '%20NOT%20artist:%22Various%20Artists%22';
const LIMIT = 100;
const LASTFM_LIMIT = 1000;
const CACHE_DIR = path.join(process.cwd(), 'data', 'genres');
const CACHE_DURATION_DAYS = 120;
const FILTER_THRESHOLD = 0;

async function lastfmArtistsFetch(limit: number, page: number, genre: string, genreID: string) {
    let totalListeners = 0;
    let totalPlays = 0;
    let totalArtists = 0;
    const res = await axios.get(`${LASTFM_TAG_URL}${genre}${URL_CONFIG}&limit=${limit}&page=${page}`);
    const artists = [];
    for (const artist of res.data.topartists.artist) {
        let mbid = artist.mbid;
        if (mbid) {
            const mbData = await axios.get(`${ARTISTS_URL}/${mbid}`, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept': 'application/json',
                },
            });
            const artistData = await singleArtistFetch(mbData, genreID);
            artists.push(artistData);
            totalListeners = artistData.listeners ? totalListeners + artistData.listeners : totalListeners;
            totalPlays = artistData.playcount ? totalPlays + artistData.playcount : totalPlays;
            totalArtists += 1;
        } else {
            const mbData = await axios.get(`${ARTISTS_URL}?query=artist:${artist.name}`, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept': 'application/json',
                },
            });
            if (mbData && mbData.data.artists[0].tags.map(t => t.name).includes(genre)) {
                const artistData = await singleArtistFetch(mbData, genreID);
                artists.push(artistData);
                totalListeners = artistData.listeners ? totalListeners + artistData.listeners : totalListeners;
                totalPlays = artistData.playcount ? totalPlays + artistData.playcount : totalPlays;
                totalArtists += 1;
            } else {
                console.log(`No data found for ${artist.name}`);
            }
        }
    }
    return { artists, totalListeners, totalPlays, totalArtists };
}

async function singleArtistFetch(artist: ArtistData, genreID: string) {
    let lastFMData;
    let imageURL;
    try {
        lastFMData = await axios.get(`${LASTFM_URL}mbid=${artist.id}${URL_CONFIG}`);
    } catch (mbidError) {
        try {
            console.log(`MBID query failed for ${artist.id}, attempting to fetch by artist name: ${artist.name}`);
            lastFMData = await axios.get(`${LASTFM_URL}artist=${artist.name}${URL_CONFIG}`);
        } catch (nameError) {
            console.log(`No last.fm data found for ${artist.name}`);
        }
    } finally {
        imageURL = await getArtistImage(artist.id, artist.name);
    }
    return {
        id: artist.id,
        name: artist.name,
        tags: artist.tags,
        genres: [genreID],
        location: artist.area ? artist.area.name : undefined,
        startDate: artist["life-span"].begin,
        endDate: artist["life-span"].end,
        lastFMmbid: !!lastFMData,
        listeners: lastFMData ? parseInt(lastFMData.data.artist.stats.listeners) : undefined,
        playcount: lastFMData ? parseInt(lastFMData.data.artist.stats.playcount) : undefined,
        bio: lastFMData ? {
            link: lastFMData.data.artist.bio.links.link.href,
            summary: lastFMData.data.artist.bio.summary.replaceAll(/<.*>/g, ''),
            content: lastFMData.data.artist.bio.content.replaceAll(/<.*>/g, '')
        } : undefined,
        similar: lastFMData ? lastFMData.data.artist.similar.artist.map((a: {
            name: string
        }) => a.name) : undefined,
        image: imageURL,
    }
}

async function mbArtistsFetch(limit: number, offset: number, genre: string, genreID: string) {
    let totalListeners = 0;
    let totalPlays = 0;
    let totalArtists = 0;
    const res = await axios.get<ArtistResponse>(`${ARTISTS_URL}?query=tag:${genre}&limit=${limit}&offset=${offset}`, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
        },
    });
    const artists = [];
    for (const artist of res.data.artists) {
        const artistData = await singleArtistFetch(artist, genreID);
        if (artistData) {
            artists.push(artistData);
            totalListeners = artistData.listeners ? totalListeners + artistData.listeners : totalListeners;
            totalPlays = artistData.playcount ? totalPlays + artistData.playcount : totalPlays;
            totalArtists += 1;
        }
    }
    return { artists, totalListeners, totalPlays, totalArtists };
}

async function getArtistsInGenre(genre: string, genreID: string) {
    let totalListeners = 0;
    let totalPlays = 0;
    let totalArtists = 0;
    try {
        const noAmpGenre = genre.replaceAll('&', '%26');
        const firstRes = await axios.get<ArtistResponse>(`${ARTISTS_URL}?query=tag:${noAmpGenre}&limit=1&offset=0`, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
            },
        });

        const mbTotal = firstRes.data.count;
        const allArtists: Artist[] = [];

        if (mbTotal > 0) {
            for (let offset = 0; offset < mbTotal; offset += LIMIT) {
                const artists = await throttleQueue.enqueue(() => mbArtistsFetch(LIMIT, offset, noAmpGenre, genreID));
                totalListeners += artists.totalListeners;
                totalPlays += artists.totalPlays;
                totalArtists += artists.totalArtists;
                allArtists.push(...artists.artists);
            }
        } else {
            const lastfmArtistsFirst = await axios.get(`${LASTFM_TAG_URL}${noAmpGenre}${URL_CONFIG}`);
            const totalPages = lastfmArtistsFirst.data.topartists['@attr'].totalPages;
            for (let page = 1; page < totalPages; page += 1) {
                const artists = await throttleQueue.enqueue(() => lastfmArtistsFetch(LASTFM_LIMIT, page, noAmpGenre, genreID));
                totalListeners += artists.totalListeners;
                totalPlays += artists.totalPlays;
                totalArtists += artists.totalArtists;
                allArtists.push(...artists.artists);
            }
        }
        return { totalListeners, totalPlays, totalArtists };
    } catch (error) {
        console.error(`Error fetching artists for genre ${genre}:`, error);
        throw error;
    }
}

async function main() {
    try {
        const firstRes = await axios.get<GenreResponse>(`${GENRES_URL}?limit=1&offset=0`, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
            },
        });

        const total = firstRes.data['genre-count'];
        const mbGenres: Genre[] = [];

        // Retrieve each page of genres (100 per request)
        for (let offset = 0; offset < total; offset += LIMIT) {
            const genres = await throttleQueue.enqueue(() => fetchGenres(LIMIT, offset));
            mbGenres.push(...genres);
        }

        if (!mbGenres || mbGenres.length === 0) {
            throw new Error('No genres found!');
        }

        const genreIds = new Set(mbGenres.map(g => g.id));

        const allGenres = [];

        for (const genre of mbGenres) {
            const scrapedData = await scrapeSingle(genre, genreIds);
            const artistData = await getArtistsInGenre(genre.id, genre.name);
            //todo: description scrape
            const genreData = {
                ...scrapedData,
                artistCount: artistData.totalArtists,
                totalListeners: artistData.totalListeners,
                totalPlays: artistData.totalPlays,
            }
            allGenres.push(genreData);
        }


    } catch (error) {
        console.error('Error fetching genres:', error);
        throw error;
    }
}

main().catch((err) => {console.log(err)});