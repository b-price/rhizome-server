import {collections} from "../db/connection";

export async function flagBadDataGenre(genreID: string) {
    await collections.genres?.updateOne({ id: genreID }, [{ $set: { badDataFlag: {$not: "$badDataFlag"} } }]);
}

export async function flagBadDataArtist(artistID: string) {
    await collections.genres?.updateOne({ id: artistID }, [{ $set: { badDataFlag: {$not: "$badDataFlag"} } }]);
}