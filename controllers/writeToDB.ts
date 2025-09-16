import {collections} from "../db/connection";
import {getAllGenresFromDB, getGenreRoots} from "./getFromDB";
import {getGeneralRootsOfGenre, getSpecificRootsOfGenre} from "../utils/rootGenres";
import {ObjectId} from "mongodb";
import {BadDataReport, Genre} from "../types";

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