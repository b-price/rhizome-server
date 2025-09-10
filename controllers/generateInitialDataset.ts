import path from "path";
import axios from "axios";
import {ArtistData, ArtistResponse, Genre, GenreResponse, MBGenre} from "../types";
import throttleQueue from "../utils/throttleQueue";
import {getArtistImage} from "./getArtistImage";
import {scrapeSingle} from "../utils/mbGenresScraper";
import {wikiScrape} from "../utils/wikiScrape";
import {getAIGenreDesc} from "../utils/geminiRequests";
import {ObjectId} from "mongodb";
import {collections} from "../db/connection";
import {loadFromCache} from "../utils/cacheOps";
import fs from "fs";

//TODO: make sure to account for duplicate mbids
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

async function updateArtist(oldID: ObjectId, genreID: string, oldGenres: string[]) {
    if (!oldGenres.includes(genreID)) {
        await collections.artists?.updateOne({ _id: oldID }, { $set: { genres: [...oldGenres, genreID] } });
    }
}

const fetchGenres = async (limit: number, offset: number): Promise<MBGenre[]> => {
    const res = await axios.get<GenreResponse>(`${GENRES_URL}?limit=${limit}&offset=${offset}`, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
        },
    });
    return res.data.genres.map(({ id, name }) => ({ id, name }));
};

async function lastfmArtistsFetch(limit: number, page: number, genre: string, genreID: string) {
    let totalListeners = 0;
    let totalPlays = 0;
    let totalArtists = 0;
    const res = await axios.get(`${LASTFM_TAG_URL}${genre}${URL_CONFIG}&limit=${limit}&page=${page}`);
    const artists = [];
    for (const artist of res.data.topartists.artist) {
        console.log(artist.name);
        let mbid = artist.mbid;
        console.log(mbid);
        if (mbid) {
            const mbData = await throttleQueue.enqueue(() => axios.get(`${ARTISTS_URL}/${mbid}`, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept': 'application/json',
                },
            }));
            const oldArtist = await collections.artists?.findOne({ id: mbid });
            if (oldArtist) {
                await updateArtist(oldArtist._id, genreID, oldArtist.genres);
                totalListeners = oldArtist.listeners ? totalListeners + oldArtist.listeners : totalListeners;
                totalPlays = oldArtist.playcount ? totalPlays + oldArtist.playcount : totalPlays;
                totalArtists += 1;
            } else {
                const artistData = await singleArtistFetch(mbData.data, genreID);
                artists.push(artistData);
                totalListeners = artistData.listeners ? totalListeners + artistData.listeners : totalListeners;
                totalPlays = artistData.playcount ? totalPlays + artistData.playcount : totalPlays;
                totalArtists += 1;
            }
        } else {
            if (artist.name) {
                const mbRes = await throttleQueue.enqueue(() => axios.get(`${ARTISTS_URL}?query=artist:"${artist.name}"`, {
                    headers: {
                        'User-Agent': USER_AGENT,
                        'Accept': 'application/json',
                    },
                }));
                const mbData = mbRes.data.artists[0];
                if (mbData && mbRes.data.artists.length > 0) {
                    const oldArtist = await collections.artists?.findOne({ id: mbid });
                    if (oldArtist) {
                        await updateArtist(oldArtist._id, genreID, oldArtist.genres);
                        totalListeners = oldArtist.listeners ? totalListeners + oldArtist.listeners : totalListeners;
                        totalPlays = oldArtist.playcount ? totalPlays + oldArtist.playcount : totalPlays;
                        totalArtists += 1;
                    } else {
                        const artistData = await singleArtistFetch(mbData, genreID);
                        artists.push(artistData);
                        totalListeners = artistData.listeners ? totalListeners + artistData.listeners : totalListeners;
                        totalPlays = artistData.playcount ? totalPlays + artistData.playcount : totalPlays;
                        totalArtists += 1;
                    }
                } else {
                    console.log(`No MB data found for ${artist.name}`);
                    const dummyMBID = `no-mbid-${artist.name}`;
                    const oldArtist = await collections.artists?.findOne({ id: dummyMBID });
                    if (oldArtist) {
                        await updateArtist(oldArtist._id, genreID, oldArtist.genres);
                        totalListeners = oldArtist.listeners ? totalListeners + oldArtist.listeners : totalListeners;
                        totalPlays = oldArtist.playcount ? totalPlays + oldArtist.playcount : totalPlays;
                        totalArtists += 1;
                    } else {
                        const dummyMbData = {
                            id: dummyMBID,
                            name: artist.name,
                            tags: [{count: 10, name: genre}],
                            genres: [genreID],
                            "life-span": {begin: '', end: ''},
                            score: 100,
                            area: {name: ''},
                            relations: []
                        }
                        const artistData = await singleArtistFetch(dummyMbData, genreID);
                        artists.push(artistData);
                        totalListeners = artistData.listeners ? totalListeners + artistData.listeners : totalListeners;
                        totalPlays = artistData.playcount ? totalPlays + artistData.playcount : totalPlays;
                        totalArtists += 1;
                    }
                }
            } else {
                console.log(`No data found for ${artist.name}`);
            }
        }
    }
    return { artists, totalListeners, totalPlays, totalArtists };
}

async function singleArtistFetch(artist: ArtistData, genreID: string) {
    const noMBID = artist.id.includes('no-mbid');
    let lastFMData;
    let imageURL;
    try {
        lastFMData = await axios.get(`${LASTFM_URL}mbid=${artist.id}${URL_CONFIG}`);
        if ('error' in lastFMData.data) {
            console.log(`MBID query failed for ${artist.id}, attempting to fetch by artist name: ${artist.name}`);
            lastFMData = await axios.get(`${LASTFM_URL}artist=${artist.name}${URL_CONFIG}`);
            if ('error' in lastFMData.data) {
                console.log(`No last.fm data found for ${artist.name}`);
            }
        }
    } catch (mbidError) {
        console.error(`Error fetching last.fm data: ${mbidError}`);
    } finally {
        if (!noMBID) {
            console.log(`Fetching image for ${artist.name}...`);
            imageURL = await getArtistImage(artist.id, artist.name);
        }
    }
    const mbArtistData = {
        id: artist.id,
        name: artist.name,
        tags: artist.tags,
        genres: [genreID],
        location: artist.area ? artist.area.name : undefined,
        startDate: artist["life-span"].begin,
        endDate: artist["life-span"].end,
        noMBID,
    }
    const lfmArtistData = lastFMData && lastFMData.data.artist ? {
            listeners: lastFMData.data.artist.stats ? parseInt(lastFMData.data.artist.stats.listeners) : undefined,
            playcount: lastFMData.data.artist.stats ? parseInt(lastFMData.data.artist.stats.playcount) : undefined,
            bio: {
                link: lastFMData.data.artist.bio.links.link.href,
                summary: lastFMData.data.artist.bio.summary.replaceAll(/<.*>/g, '').replaceAll(/\[.*]/g, ''),
                content: lastFMData.data.artist.bio.content.replaceAll(/<.*>/g, '').replaceAll(/\[.*]/g, '').split('User-contributed text')[0],
            },
            similar: lastFMData.data.artist.similar.artist.map((a: {
                name: string
            }) => a.name),
        } : {
            listeners: undefined,
            playcount: undefined,
            bio: {
                link: undefined,
                summary: undefined,
                content: undefined,
            },
            similar: [],
    }
    const finalArtistData = {
        ...mbArtistData,
        ...lfmArtistData,
        image: imageURL,
    };
    await collections.artists?.insertOne(finalArtistData);
    
    return finalArtistData;
}

async function mbArtistsFetch(limit: number, offset: number, genre: string, genreID: string) {
    let totalListeners = 0;
    let totalPlays = 0;
    let totalArtists = 0;
    const res = await throttleQueue.enqueue(() => axios.get<ArtistResponse>(`${ARTISTS_URL}?query=tag:"${genre}"&limit=${limit}&offset=${offset}`, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
        },
    }));
    const artists = [];
    for (const artist of res.data.artists) {
        const oldArtist = await collections.artists?.findOne({ id: artist.id });
        if (oldArtist) {
            await updateArtist(oldArtist._id, genreID, oldArtist.genres);
            totalListeners = oldArtist.listeners ? totalListeners + oldArtist.listeners : totalListeners;
            totalPlays = oldArtist.playcount ? totalPlays + oldArtist.playcount : totalPlays;
            totalArtists += 1;
        } else {
            console.log(`Fetching data for ${artist.name}...`);``
            const artistData = await singleArtistFetch(artist, genreID);
            if (artistData) {
                artists.push(artistData);
                totalListeners = artistData.listeners ? totalListeners + artistData.listeners : totalListeners;
                totalPlays = artistData.playcount ? totalPlays + artistData.playcount : totalPlays;
                totalArtists += 1;
            }
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
        const firstRes = await axios.get<ArtistResponse>(`${ARTISTS_URL}?query=tag:"${noAmpGenre}"&limit=1&offset=0`, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
            },
        });

        const mbTotal = firstRes.data.count;

        if (mbTotal > 0) {
            for (let offset = 0; offset < mbTotal; offset += LIMIT) {
                const artists = await mbArtistsFetch(LIMIT, offset, noAmpGenre, genreID);
                totalListeners += artists.totalListeners;
                totalPlays += artists.totalPlays;
                totalArtists += artists.totalArtists;
            }
        } else {
            console.log(`No artists in MB for: ${genre}, trying Last.fm...`);
            const lastfmArtistsFirst = await axios.get(`${LASTFM_TAG_URL}${noAmpGenre}${URL_CONFIG}`);
            const totalPages = lastfmArtistsFirst.data.topartists['@attr'].totalPages;
            if (totalPages > 0) {
                for (let page = 1; page <= totalPages; page += 1) {
                    const artists = await lastfmArtistsFetch(LASTFM_LIMIT, page, noAmpGenre, genreID);
                    totalListeners += artists.totalListeners;
                    totalPlays += artists.totalPlays;
                    totalArtists += artists.totalArtists;
                }
            }
        }
        return { totalListeners, totalPlays, totalArtists };
    } catch (error) {
        console.error(`Error fetching artists for genre ${genre}:`, error);
        throw error;
    }
}

export async function getMBGenres(genresSize?: number) {
    const firstRes = await axios.get<GenreResponse>(`${GENRES_URL}?limit=1&offset=0`, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
        },
    });

    const total = firstRes.data['genre-count'];
    // if (genresSize && genresSize === total) {
    //     const cacheFilePath = path.join(CACHE_DIR, 'allGenres.json');
    //     return JSON.parse(fs.readFileSync(cacheFilePath, 'utf8')) as Genre[];
    // }
    console.log(`Fetching ${total} genres...`);
    const mbGenres: Genre[] = [];

    // Retrieve each page of genres (100 per request)
    for (let offset = 0; offset < total; offset += LIMIT) {
        const genres = await throttleQueue.enqueue(() => fetchGenres(LIMIT, offset));
        mbGenres.push(...genres);
    }

    return mbGenres;
}

export async function generateDataset() {
    try {
        const genresSize = await collections.genres?.countDocuments();
        const mbGenres = await getMBGenres(genresSize);

        if (!mbGenres || mbGenres.length === 0) {
            throw new Error('No genres found!');
        }

        const genreIds = new Set(mbGenres.map(g => g.id));

        const allGenres = [];

        for (let i = 0; i < mbGenres.length; i++) {
            console.log(`Processing genre ${i + 1} of ${mbGenres.length}: ${mbGenres[i].name}...`);
            const scrapedData = await scrapeSingle(mbGenres[i], genreIds);
            let description = await wikiScrape(mbGenres[i].name);
            let aiDesc = false;
            if (!description) {
                const aiDescription = await getAIGenreDesc(mbGenres[i].name);
                if (aiDescription) {
                    description = aiDescription;
                    aiDesc = true;
                }
            }
            console.log(`Fetching all artists in ${mbGenres[i].name}...`);
            const artistData = await getArtistsInGenre(mbGenres[i].name, mbGenres[i].id);

            const genreData = {
                ...scrapedData,
                artistCount: artistData.totalArtists,
                totalListeners: artistData.totalListeners,
                totalPlays: artistData.totalPlays,
                description: description,
                descriptionAI: aiDesc,
            }
            allGenres.push(genreData);
            await collections.genres?.updateOne({ id: genreData.id }, {$set: genreData}, {upsert: true});
            console.log(genreData)
        }


    } catch (error) {
        console.error('Error fetching genres:', error);
        throw error;
    }
}

// async function main() {
//     generateDataset();
// }
//
// main().catch((err) => {console.log(err)});