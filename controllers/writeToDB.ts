import {collections} from "../db/connection";
import {getAllGenresFromDB, getGenreRoots} from "./getFromDB";
import {getRootGenresOfGenre} from "../utils/rootGenres";
import {ObjectId} from "mongodb";

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
    if (genres) {
        for (const genre of genres) {
            const roots = getRootGenresOfGenre(genre, genres);
            await collections.genres?.updateOne({ id: genre.id }, [{$set: {rootGenres: roots }}]);
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