import {Genre} from "../types";
import {getAllGenresFromDB} from "../controllers/getFromDB";

/**
 * console.log every genre in order of the DB.
 * @param amount
 * @param fields
 * @param showFields
 */
export async function printAllGenres(amount?: number, fields?: string[], showFields = true) {
    const genres = await getAllGenresFromDB();
    const length = amount ? amount : genres.length;
    for (let i = 0; i < length; i++) {
        console.log(`Genre ${i + 1}/${length}: ${genres[i].name}`)
        if (showFields) {
            for (const field of Object.keys(genres[i])) {
                if (!fields || fields.includes(field)) {
                    console.log(`   ${field}: ${genres[i][field as keyof Genre]}`);
                }
            }
        }
    }
}
