import {collections} from "../db/connection";
import {getAllGenresFromDB, getGenreRoots, getTopArtists, matchArtistNameInDB} from "./getFromDB";
import {getGeneralRootsOfGenre, getSpecificRootsOfGenre} from "../utils/rootGenres";
import {ObjectId, PushOperator} from "mongodb";
import {ArtistLike, BadDataReport, Feedback, Genre, Preferences, TopTrack} from "../types";
import {topTracksArtist} from "./lastFMTopTracks";
import {getYoutubeTrackID} from "./youTubeTopTracks";
import {getSpotifyTrackID} from "./spotifyTopTracks";
import {DEFAULT_USER_PREFERENCES} from "../utils/defaults";
import {generateAccessCodes} from "../utils/generateAccessCodes";
import {fetchLastFMUserArtists} from "../utils/fetchLastFMUserArtists";
import {mbArtistSearch} from "./mbArtistSearch";
import {checkLastFMUsername} from "../utils/checkLastFMUsername";
import throttleQueue from "../utils/throttleQueue";
import {artistNamesMatch} from "../utils/parsing";

export async function flipBadDataGenre(genreID: string, reason: string) {
    await collections.genres?.updateOne({ id: genreID }, [
        {
            $set: {
                // If the field is missing, create it as true; else toggle it.
                badDataFlag: {
                    $cond: [
                        { $eq: [{ $type: "$badDataFlag" }, "missing"] },
                        true,
                        { $not: [{ $toBool: "$badDataFlag" }] }
                    ]
                },
                badDataReason: reason
            }
        }
    ]);
}

export async function flipBadDataArtist(artistID: string, reason: string) {
    return await collections.artists?.updateOne(
        { id: artistID },
        [
            {
                $set: {
                    // If the field is missing, create it as true; else toggle it.
                    badDataFlag: {
                        $cond: [
                            { $eq: [{ $type: "$badDataFlag" }, "missing"] },
                            true,
                            { $not: [{ $toBool: "$badDataFlag" }] }
                        ]
                    },
                    badDataReason: reason
                }
            }
        ]
    );
}

export async function addRootsToGenres() {
    const genres = await getAllGenresFromDB();
    //const genres2 = await collections.genres?.find({ id: 'd4b71a23-7dc0-4291-9a8d-a27d5dbbf9f2'}).toArray();
    if (genres) {
        let i = 0;
        const length = genres.length;
        for (const genre of genres) {
            const comboRoots = getGeneralRootsOfGenre(genre as unknown as Genre, genres as unknown as Genre[], ['subgenre', 'fusion']);
            await collections.genres?.updateOne({ id: genre.id }, [{$set: {rootGenres: comboRoots }}]);
            i++;
            console.log(`Updated roots for genre ${i}/${length}: ${genre.name}`);
        }
    }
}

export async function addSpecificRootsToGenres() {
    const genres = await getAllGenresFromDB();
    //const genres2 = await collections.genres?.find({ id: 'd4b71a23-7dc0-4291-9a8d-a27d5dbbf9f2'}).toArray();
    if (genres) {
        let i = 0;
        const length = genres.length;
        for (const genre of genres) {
            const individualRoots = getSpecificRootsOfGenre(genre as unknown as Genre, genres);
            await collections.genres?.updateOne({ id: genre.id }, [{$set: {specificRootGenres: individualRoots }}]);
            i++;
            console.log(`Updated specific roots for genre ${i}/${length}: ${genre.name}`);
        }
    }
}

export async function updateRootGenres() {
    const roots = await getGenreRoots();
    const rootDoc = await collections.misc?.findOne({ _id: new ObjectId(process.env.ROOTS_DOCUMENT_ID) });
    if (roots) {
        if (rootDoc) {
            await collections.misc?.updateOne({ _id: rootDoc._id }, [{$set: {rootGenres: roots.map(g => g.id) }}]);
        } else {
            const newDoc = await collections.misc?.insertOne({rootGenres: roots.map(g => g.id) });
            if (newDoc) console.log(newDoc.insertedId);
        }
    }
}

export async function submitBadDataReport(report: BadDataReport) {
    if (report.type === 'genre') await setBadDataGenre(report.itemID);
    if (report.type === 'artist') await setBadDataArtist(report.itemID);
    await collections.badDataReports?.insertOne(report);
}

async function setBadDataGenre(genreID: string) {
    await collections.genres?.updateOne({ id: genreID }, [{ $set: { badDataFlag: true } }]);
}

async function setBadDataArtist(artistID: string) {
    await collections.artists?.updateOne({ id: artistID }, [{ $set: { badDataFlag: true } }]);
}

export async function updateArtistTopTracks(artistID: string, artistName: string, amount = 5) {
    const topTracks = await topTracksArtist(artistID, artistName, amount);
    if (topTracks.length) {
        await collections.artists?.updateOne({ id: artistID }, [{ $set: { topTracks: topTracks } }]);
    } else {
        await collections.artists?.updateOne({ id: artistID }, [{ $set: { noTopTracks: true } }])
    }
    return topTracks;
}

async function updateGenreTopArtists(genreID: string, amount: number,  genreName?: string) {
    const topArtists = await getTopArtists(genreID, amount, genreName);
    if (topArtists && topArtists.length) {
        //console.log(genreName)
        await collections.genres?.updateOne({ id: genreID }, { $set: { topArtists: topArtists.map(a => {
            return { id: a.id, name: a.name };
        }) } });
    }
}

export async function addTopArtistsToGenres() {
    const genres = await getAllGenresFromDB();
    if (genres) {
        console.log('Adding top artists to genres...');
        await Promise.all(genres.map((genre) => {updateGenreTopArtists(genre.id, 8, genre.name)}));
        console.log('Complete!');
    }
}

export async function addTopTracksToAllGenreTopArtists() {
    const genres = await getAllGenresFromDB();
    if (genres) {
        let i = 0;
        const count = genres.length;
        for (const genre of genres.slice(i)) {
            i++;
            console.log(`Genre ${i}/${count}: ${genre.name}`);
            if (genre.topArtists) {
                for (const topArtist of genre.topArtists) {
                    const topArtistData = await collections.artists?.findOne(
                        {
                            id: topArtist.id,
                            topTracks: { $exists: true, $ne: [] }
                        },
                        //{ projection: { _id: 0, id: 1 } }
                    );
                    if (!topArtistData) {
                        console.log(`   Adding top tracks for ${topArtist.name}`);
                        await updateArtistTopTracks(topArtist.id, topArtist.name, 5);
                    } else {
                        if (topArtistData.noTopTracks) continue;
                        let changed = false;
                        const newTracks = [];
                        for (const track of topArtistData.topTracks) {
                            const ytID = track.youtube ? undefined : await getYoutubeTrackID(topArtist.name, track.title);
                            const spID = track.spotify ? undefined : await getSpotifyTrackID(topArtist.name, track.title);
                            if (ytID || spID) changed = true;
                            newTracks.push({
                                ...track,
                                youtube: ytID ? ytID : track.youtube,
                                spotify: spID ? spID : track.spotify,
                            });
                        }
                        if (changed) {
                            console.log(`  Found new ids for ${topArtist.name}`);
                            await collections.artists?.updateOne({ id: topArtist.id }, [{ $set: { topTracks: newTracks } }]);
                        }
                        // runs YT + Spotify in parallel per track, and all tracks in parallel
                        // const results = await Promise.all(
                        //     hasTopTracks.topTracks.map(async (track: TopTrack) => {
                        //         // only fetch what’s missing; keep existing values
                        //         const ytP = track.youtube
                        //             ? Promise.resolve(track.youtube)
                        //             : getYoutubeTrackID(topArtist.name, track.title);
                        //
                        //         const spP = track.spotify
                        //             ? Promise.resolve(track.spotify)
                        //             : getSpotifyTrackID(topArtist.name, track.title);
                        //
                        //         const [yt, sp] = await Promise.allSettled([ytP, spP]);
                        //
                        //         const newYoutube =
                        //             track.youtube ?? (yt.status === "fulfilled" ? yt.value : undefined);
                        //         const newSpotify =
                        //             track.spotify ?? (sp.status === "fulfilled" ? sp.value : undefined);
                        //
                        //         const trackChanged =
                        //             newYoutube !== track.youtube || newSpotify !== track.spotify;
                        //
                        //         return {
                        //             ...track,
                        //             youtube: newYoutube,
                        //             spotify: newSpotify,
                        //             __changed: trackChanged,
                        //         };
                        //     })
                        // );
                        //
                        // const newTracks = results.map(({ __changed, ...t }) => t);
                        // const changed = results.some(r => (r as any).__changed);
                        //
                        // if (changed) {
                        //     console.log(`  Found new ids for ${topArtist.name}`);
                        //     await collections.artists?.updateOne(
                        //         { id: topArtist.id },
                        //         [{ $set: { topTracks: newTracks } }] // keep your pipeline-style update
                        //         // or: { $set: { topTracks: newTracks } } // regular update is fine too
                        //     );
                        // }

                    }
                }
            }
        }
    }
}

export async function createUserData(id: string, socialUser?: boolean) {
    await collections.users?.insertOne({ id: id, liked: [], preferences: DEFAULT_USER_PREFERENCES, socialUser });
}

export async function deleteUserData(id: string) {
    await collections.users?.deleteOne({ id: id });
}

export async function addUserLikedArtist(userID: string, artistID: string) {
    await collections.users?.updateOne(
        { id: userID, "liked.id": { $ne: artistID }  },
        { $push: { liked: { id: artistID, date: new Date() } } as unknown as PushOperator<Document> }
    );
}

export async function removeUserLikedArtist(userID: string, artistID: string) {
    await collections.users?.updateOne({ id: userID }, { $pull: { liked: { id: artistID } } as unknown as PushOperator<Document> });
}

export async function updateUserPreferences(id: string, preferences: Preferences) {
    await collections.users?.updateOne( { id: id }, { $set: { preferences: preferences } });
}

export async function submitFeedback(feedback: Feedback) {
    await collections.feedback?.insertOne(feedback);
}

export async function writeAccessCodes(emails: string[], phase: string, version: string) {
    const codes = generateAccessCodes(emails, phase, version);
    await collections.accessCodes?.insertMany(codes);
}

export async function assignUserToAccessCode(userID: string, code: string) {
    await collections.accessCodes?.updateOne({ code }, { $set: { userID } });
}

export async function setCodeAccessed(code: string, accessed: boolean) {
    await collections.accessCodes?.updateOne({ code }, { $set: { accessed } });
}

export async function addLFMtoUser(userID: string, lfmUsername: string, updateLiked = true) {
    if (await verifyLastFMUser(lfmUsername)) {
        await collections.users?.updateOne({id: userID}, { $set: { lfmUsername: lfmUsername } });
        if (updateLiked) {
            await updateUserLikesFromLastFM(userID, lfmUsername);
        }
    } else {
        throw new Error(`Last.fm user ${lfmUsername} not found.`);
    }
}

export async function verifyLastFMUser(lfmUsername: string) {
    const user = await checkLastFMUsername(lfmUsername);
    return (user && user.name);
}

export async function getLastFMUsername(userID: string) {
    const user = await collections.users?.findOne({ userID });
    if (user && user.lfmUsername) return user.lfmUsername;
}

export async function updateUserLikesFromLastFM(userID: string, lastfmUsername?: string, addSusNames = false) {
    const lfmUsername = lastfmUsername ? lastfmUsername : await getLastFMUsername(userID);
    if (!lfmUsername) throw new Error('No last.fm username found.');
    const lfmArtistsData = await fetchLastFMUserArtists(lfmUsername);
    if (!lfmArtistsData || !lfmArtistsData.artists.length) throw new Error('No artists found in user last.fm account.');
    const lfmArtists = lfmArtistsData.artists;
    const projection = { "liked.id": 1, _id: 0 };
    const user = await collections.users?.findOne({ id: userID }, { projection });

    const existingIDs = new Set((user?.liked ?? []).map((a: ArtistLike) => a.id));
    const doNotAddIdx: number[] = [];
    const susIdx: number[] = [];

    for (let i = 0; i < lfmArtists.length; i++) {
        // Don't try to re-add artists the user already likes
        if (existingIDs.has(lfmArtists[i].id)) {
            doNotAddIdx.push(i);
        } else if (!lfmArtists[i].id || !lfmArtists[i].id.length) {
            // const bestMatch = await throttleQueue.enqueue(() => mbArtistSearch(lfmArtists[i].name, 1));
            const bestMatch = await matchArtistNameInDB(lfmArtists[i].name, 1);
            if (bestMatch && bestMatch[0] && bestMatch[0].id) {
                //console.log(`Found match for ${lfmArtists[i].name}: ${bestMatch[0].name}, ${bestMatch[0].startDate}, ${bestMatch[0].location}`);
                if (!artistNamesMatch(lfmArtists[i].name, bestMatch[0].name)) {
                    susIdx.push(i);
                    //console.log('(But the name is not an exact match)');
                }
                lfmArtists[i].id = bestMatch[0].id;
            } else {
                //console.log('no artist found with name ', lfmArtists[i].name);
                doNotAddIdx.push(i);
            }
        }
    }
    //console.log('Total artists found: ', lfmArtists.length);
    for (const index of doNotAddIdx) {
        lfmArtists.splice(index, 1);
    }
    //console.log('Less not-found artists: ', lfmArtists.length);
    if (!addSusNames) {
        for (const index of susIdx) {
            lfmArtists.splice(index, 1);
        }
    }
    //console.log('Less poorly-matched artists: ', lfmArtists.length);
    await collections.users?.updateOne(
        { id: userID },
        { $push: { liked: { $each: lfmArtists } } as unknown as PushOperator<Document> }
    );
}