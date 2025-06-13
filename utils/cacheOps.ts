import fs from "fs";
import {ArtistJSON} from "../controllers/artistFetcher";
import {GenresJSON} from "../controllers/genreFetcher";

export const ensureCacheDir = (cacheDir: string) => {
    try {
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
    } catch (error) {
        console.error('Error creating cache directory:', error);
    }
};

export const isCacheValid = (filePath: string, cacheDurationDays: number): boolean => {
    try {
        if (!fs.existsSync(filePath)) {
            return false;
        }


        const stats = fs.statSync(filePath);
        const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        return ageInDays < cacheDurationDays;
    } catch (error) {
        console.error('Error checking cache validity:', error);
        return false;
    }
};

export const loadFromCache = (filePath: string, cacheDurationDays: number): ArtistJSON | GenresJSON | null => {
    try {
        if (!isCacheValid(filePath, cacheDurationDays)) {
            return null;
        }

        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading from cache:', error);
        return null;
    }
};

export const saveToCache = (filePath: string, data: ArtistJSON | GenresJSON, cacheDir: string): void => {
    try {
        ensureCacheDir(cacheDir);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving to cache:', error);
    }
};