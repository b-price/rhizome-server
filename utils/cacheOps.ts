import fs from "fs";
import {ArtistJSON, GenresJSON, CacheValidity, LastFMArtistJSON, CacheResponse, MBGenre} from "../types";

export const ensureCacheDir = (cacheDir: string) => {
    try {
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
    } catch (error) {
        console.error('Error creating cache directory:', error);
    }
};

export const isCacheValid = (filePath: string, cacheDurationDays: number): CacheValidity => {
    let cacheValidity: CacheValidity = 'notFound';
    try {
        if (!fs.existsSync(filePath)) {
            return cacheValidity;
        }

        const stats = fs.statSync(filePath);
        const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        return ageInDays < cacheDurationDays ? 'valid' : 'stale';
    } catch (error) {
        console.error('Error checking cache validity:', error);
        return 'error';
    }
};

export const loadFromCache = (filePath: string, cacheDurationDays: number): CacheResponse => {
    try {
        const cacheValidity = isCacheValid(filePath, cacheDurationDays)
        if (cacheValidity === 'notFound') {
            return {valid: cacheValidity, data: null};
        }

        const data = fs.readFileSync(filePath, 'utf8');
        return {valid: cacheValidity, data: JSON.parse(data)};
    } catch (error) {
        console.error('Error loading from cache:', error);
        return {valid: 'error', data: null};
    }
};

export const saveToCache = (filePath: string, data: ArtistJSON | GenresJSON | LastFMArtistJSON | MBGenre[], cacheDir: string): void => {
    try {
        ensureCacheDir(cacheDir);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving to cache:', error);
    }
};

export const deleteCacheDir = (cacheDir: string): void => {
    try {
        fs.unlinkSync(cacheDir);
    } catch (error) {
        console.error('Error deleting cache:', error);
    }
}