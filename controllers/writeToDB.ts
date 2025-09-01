import {collections} from "../db/connection";

export async function flagBadDataGenre(genreID: string, reason: string) {
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

export async function flagBadDataArtist(artistID: string, reason: string) {
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