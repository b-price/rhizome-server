import {ArtistLike} from "../types";
import {matchArtistNameInDB} from "../controllers/getFromDB";

export const sanitizeGenre = (genreName: string) => {
    return genreName.replaceAll(' ', '_').replaceAll('&', 'ampersand').replaceAll('"', '').toLowerCase();
}

export const genreIsEqual = (genre1: string, genre2: string) => {
    return genre1.toLowerCase().replaceAll('"', '') === genre2.toLowerCase().replaceAll('"', '');
}

export function normalizeArtistName(name: string): string {
    return name
        .normalize("NFD")                         // separate diacritics
        .replace(/[\u0300-\u036f]/g, "")          // remove diacritics
        .toLowerCase()
        .replace(/\b(the|and)\b/g, "")            // remove whole words
        .replace(/[,\.'"!_\-+&]/g, "")            // remove specific punctuation
        .replace(/\s+/g, "")                      // remove whitespace
        .trim();
}

export function artistNamesMatch(a: string, b: string): boolean {
    return normalizeArtistName(a) === normalizeArtistName(b);
}

// Returns artists that should be added
export async function processLfmArtists(lfmArtists: ArtistLike[], existingLikes: ArtistLike[], addSusNames = false, updateExisting = false) {
    const artistsToAdd: ArtistLike[] = [];
    const existingIDs = new Map<string, ArtistLike | undefined>((existingLikes ?? []).map((a: ArtistLike) => [a.id, a]));
    for (const artist of lfmArtists) {
        // If the artist has no mbid on Last.FM, find it in Rhizome's db
        if (!artist.id && artist.name) {
            console.log(artist.name);
            const bestMatch = await matchArtistNameInDB(artist.name, 1);
            if (bestMatch && bestMatch[0] && bestMatch[0].id) {
                console.log(bestMatch[0].id)
                // Update the already added artist's playcount if it's a re-sync
                if (updateExisting) {
                    if (existingIDs.has(bestMatch[0].id)) {
                        const existingArtist = existingIDs.get(bestMatch[0].id);
                        if (existingArtist && (addSusNames || artistNamesMatch(artist.name, bestMatch[0].name))) {
                            artistsToAdd.push({
                                id: bestMatch[0].id,
                                date: existingArtist.date ?? artist.date,
                                playcount: existingArtist.playcount && artist.playcount ? existingArtist.playcount + artist.playcount : artist.playcount,
                                lastFM: existingArtist.lastFM ?? true,
                            });
                        }
                    }
                    // Add a new artist if found
                } else if (!existingIDs.has(bestMatch[0].id)) {
                    if (addSusNames || artistNamesMatch(artist.name, bestMatch[0].name)) {
                        artistsToAdd.push({
                            id: bestMatch[0].id,
                            date: artist.date,
                            playcount: artist.playcount,
                            lastFM: true
                        });
                    }
                }
            }
        } else {
            // Update the already added artist's playcount if it's a re-sync
            if (updateExisting && existingIDs.has(artist.id)) {
                const existingArtist = existingIDs.get(artist.id);
                if (existingArtist) {
                    artistsToAdd.push({
                        id: artist.id,
                        date: existingArtist.date ?? artist.date,
                        playcount: existingArtist.playcount && artist.playcount ? existingArtist.playcount + artist.playcount : artist.playcount,
                        lastFM: existingArtist.lastFM ?? true,
                    });
                }
            }
            // Add a new artist
            if (!existingIDs.has(artist.id)) {
                artistsToAdd.push({id: artist.id, date: artist.date, playcount: artist.playcount, lastFM: true})
            }
        }
    }
    return artistsToAdd;
}