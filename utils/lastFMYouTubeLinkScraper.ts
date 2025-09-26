import * as cheerio from "cheerio";

/**
 * Scrapes the YouTube link from a Last.fm track page.
 *
 * @param url - The Last.fm track page URL
 * @returns The YouTube link as a string, or null if not found
 */
export async function scrapeLastFMYouTubeLink(url: string): Promise<string | undefined> {
    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(10000), // optional timeout
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${url}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Primary selector
        let youtubeLink = $("a.header-new-playlink").attr("href");

        // Fallback: any anchor with href containing "youtube.com"
        // if (!youtubeLink) {
        //     youtubeLink = $('a[href*="youtube.com"]').attr("href") ?? undefined;
        // }

        return youtubeLink ?? undefined;
    } catch (err) {
        console.error(`Error scraping YouTube link:`, err);
        return undefined;
    }
}
