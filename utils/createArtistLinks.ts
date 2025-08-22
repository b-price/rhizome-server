import {Artist, NodeLink} from "../types";

//Don't use; always worse on time and sometimes worse on memory
export const createArtistLinksLessMemory = (artists: Artist[]) => {
    const pairs = new Set<NodeLink>();

    for (const artist of artists) {
        if (artist.similar && artist.similar.length > 0) {
            for (const similarName of artist.similar) {
                const similarArtist = artists.find((artist) => artist.name === similarName);
                if (similarArtist) {
                    const [aS, aT] = [similarArtist.id, artist.id].sort();
                    pairs.add({source: aS, target: aT, linkType: 'similar'});
                }
            }
        }
    }

    return Array.from(pairs);
}

export const createArtistLinksLessCPU = (artists: Artist[]) => {
    const pairs = new Set<NodeLink>();
    const artistsMap = new Map<string, string>(artists.map(a => [a.name, a.id]));
    for (const artist of artists) {
        if (artist.similar && artist.similar.length > 0) {
            for (const similarName of artist.similar) {
                const similarArtistID = artistsMap.get(similarName);
                if (similarArtistID) {
                    const [aS, aT] = [similarArtistID, artist.id].sort();
                    pairs.add({source: aS, target: aT, linkType: 'similar'});
                }
            }
        }
    }

    return Array.from(pairs);
}