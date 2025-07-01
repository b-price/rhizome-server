import { NodeLink } from '../types';

interface GenreRelation {
    id: string;
    name: string;
}

interface ExtendedGenre {
    id: string;
    name: string;
    artistCount: number;
    subgenre_of: GenreRelation[];
    influenced_genres: GenreRelation[];
    subgenres: GenreRelation[];
    fusion_genres: GenreRelation[];
    fusion_of: GenreRelation[];
    influenced_by: GenreRelation[];
}

export function createGenreLinks(genres: ExtendedGenre[]): NodeLink[] {
    const linkSet = new Set<string>();
    const links: NodeLink[] = [];

    // Helper function to add a unique link
    const addLink = (sourceId: string, targetId: string) => {
        // Create a consistent key for the link pair (alphabetically sorted to ensure uniqueness)
        const linkKey = sourceId < targetId ? `${sourceId}:${targetId}` : `${targetId}:${sourceId}`;

        if (!linkSet.has(linkKey)) {
            linkSet.add(linkKey);
            // Always use the alphabetically smaller id as source for consistency
            const source = sourceId < targetId ? sourceId : targetId;
            const target = sourceId < targetId ? targetId : sourceId;
            links.push({ source, target });
        }
    };

    // Process each genre and its relationships
    for (const genre of genres) {
        const relationshipFields: (keyof Pick<ExtendedGenre,
            'subgenre_of' | 'influenced_genres' | 'subgenres' |
            'fusion_genres' | 'fusion_of' | 'influenced_by'>)[] = [
            'subgenre_of',
            'influenced_genres',
            'subgenres',
            'fusion_genres',
            'fusion_of',
            'influenced_by'
        ];

        // Check each relationship field
        for (const field of relationshipFields) {
            const relations = genre[field];
            if (relations && relations.length > 0) {
                for (const relation of relations) {
                    addLink(genre.id, relation.id);
                }
            }
        }
    }

    return links;
}