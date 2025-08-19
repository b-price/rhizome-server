import {Artist, NodeLink} from "../types";

export const createArtistLinks = (artists: Artist[]) => {
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

    // Convert back to array of pairs
    return Array.from(pairs);
}