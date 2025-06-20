import {NodeLink} from "../types";

export const createArtistLinks = (tagMap: Map<string, string[]>) => {
    const pairs = new Set<NodeLink>();

    for (const artists of tagMap.values()) {
        const len = artists.length;
        for (let i = 0; i < len; i++) {
            for (let j = i + 1; j < len; j++) {
                const [a1, a2] = [artists[i], artists[j]].sort(); // sort to normalize
                pairs.add({source: a1, target: a2});
            }
        }
    }

    // Convert back to array of pairs
    return Array.from(pairs);
}