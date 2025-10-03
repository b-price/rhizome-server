import * as cheerio from "cheerio";
import {TopTrack} from "../types";

export async function scrapeLastFMPlayLink(title: string, artistName: string, url: string): Promise<TopTrack | undefined> {
    try {
        //const start = Date.now();
        const response = await fetch(url, {
            signal: AbortSignal.timeout(30000), // optional timeout
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${url}`);
        }
        const linkClass = "visible-xs.play-this-track-playlink.play-this-track-playlink--";

        const html = await response.text();
        const $ = cheerio.load(html);

        // Primary selector
        let youtubeLink = $("a.header-new-playlink").attr("href");
        const spotifyID = $(`a.${linkClass}spotify`).attr("href");
        const appleID = $(`a.${linkClass}itunes`).attr("href");

        // Fallback: any anchor with href containing "youtube.com"
        // if (!youtubeLink) {
        //     youtubeLink = $('a[href*="youtube.com"]').attr("href") ?? undefined;
        // }

        //const end = Date.now();
        //console.log(`LFM scrape took ${end - start}ms`);
        //console.log(youtubeLink)
        //console.log(spotifyID)
        //console.log(appleID)
        return youtubeLink || spotifyID || appleID ? {
            title,
            artistName,
            youtube: youtubeLink?.split('v=')[1],
            spotify: spotifyID?.split('track/')[1],
            apple: appleID
        } : undefined;
    } catch (err) {
        console.error(`Error scraping play links:`, err);
        return undefined;
    }
}

// if (require.main === module) {
//     scrapeLastFMPlayLink('https://www.last.fm/music/Black+Sabbath/_/Heaven+and+Hell')
// }
