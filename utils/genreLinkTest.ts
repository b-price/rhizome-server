import * as fs from 'fs';
import * as path from 'path';
import { createGenreLinks } from './genreLinks';

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

function runGenreLinkTest() {
    try {
        // Read the genres from the JSON file
        const filePath = path.join(__dirname, 'filtered_genres.json');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const genres: ExtendedGenre[] = JSON.parse(fileContent);

        console.log(`Loaded ${genres.length} genres from filtered_genres.json`);

        // Measure performance
        const startTime = Date.now();
        const links = createGenreLinks(genres);
        const endTime = Date.now();

        console.log(`Generated ${links.length} unique links in ${endTime - startTime}ms`);

        // Display some sample links
        console.log('\nSample links:');
        const sampleSize = Math.min(10, links.length);
        for (let i = 0; i < sampleSize; i++) {
            const link = links[i];
            const sourceGenre = genres.find(g => g.id === link.source);
            const targetGenre = genres.find(g => g.id === link.target);
            console.log(`  ${sourceGenre?.name || link.source} <-> ${targetGenre?.name || link.target}`);
        }

        // Verify uniqueness (this should always be true with our implementation)
        const linkStrings = links.map(link => `${link.source}:${link.target}`);
        const uniqueLinkStrings = new Set(linkStrings);
        console.log(`\nUniqueness check: ${linkStrings.length === uniqueLinkStrings.size ? 'PASSED' : 'FAILED'}`);

        // Count relationships by type
        const relationshipCounts = {
            subgenre_of: 0,
            influenced_genres: 0,
            subgenres: 0,
            fusion_genres: 0,
            fusion_of: 0,
            influenced_by: 0
        };

        for (const genre of genres) {
            relationshipCounts.subgenre_of += genre.subgenre_of?.length || 0;
            relationshipCounts.influenced_genres += genre.influenced_genres?.length || 0;
            relationshipCounts.subgenres += genre.subgenres?.length || 0;
            relationshipCounts.fusion_genres += genre.fusion_genres?.length || 0;
            relationshipCounts.fusion_of += genre.fusion_of?.length || 0;
            relationshipCounts.influenced_by += genre.influenced_by?.length || 0;
        }

        console.log('\nRelationship counts by type:');
        Object.entries(relationshipCounts).forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });

        const totalRelationships = Object.values(relationshipCounts).reduce((sum, count) => sum + count, 0);
        console.log(`  Total relationships: ${totalRelationships}`);
        console.log(`  Unique links generated: ${links.length}`);
        console.log(`  Deduplication ratio: ${((totalRelationships - links.length) / totalRelationships * 100).toFixed(1)}%`);

        return links;

    } catch (error) {
        console.error('Error running genre link test:', error);
        if (error instanceof Error) {
            if (error.message.includes('ENOENT')) {
                console.error('Make sure filtered_genres.json exists in the same directory as this test file.');
            }
        }
    }
}

// Run the test
if (require.main === module) {
    runGenreLinkTest();
}

export { runGenreLinkTest };