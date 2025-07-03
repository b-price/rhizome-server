import {Genre, NodeLink} from '../types';

export function genreLinksByRelation(genres: Genre[]): NodeLink[] {
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
        const relationshipFields: (keyof Pick<Genre,
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