import path from "path";
import fs from "fs";
import {Genre} from "../types";
import {getSingletons} from "../utils/getSingletons";
import {ensureCacheDir} from "../utils/cacheOps";

function writeSingletons() {
    try {
        // Read the genres from the JSON file
        const filePath = path.join(__dirname, '..', 'data', 'genres', 'allGenres.json');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const genres: Genre[] = JSON.parse(fileContent).genres;

        console.log(`Loaded ${genres.length} genres from allGenres.json`);
        return getSingletons(genres);
    } catch (err) {
        console.error(err);
    }
}

if (require.main === module) {
    const singletons = writeSingletons();
    console.log(`Saving ${singletons ? singletons.length : 0} singleton genres...`);
    const cacheDir = path.join(process.cwd(), 'data', 'genres');
    const cacheFilePath = path.join(cacheDir, 'singletonGenres.json')
    try {
        ensureCacheDir(cacheDir);
        fs.writeFileSync(cacheFilePath, JSON.stringify(singletons, null, 2));
        console.log('Saved singleton genres to cache.')
    } catch (error) {
        console.error('Error saving to cache:', error);
    }
}