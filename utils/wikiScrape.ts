import * as cheerio from 'cheerio';

const BASE_URL = 'https://en.wikipedia.org/wiki/';

export async function wikiScrape(genre: string) {
    const wikiGenre = genre.replaceAll(' ', '_');
    const url = `${BASE_URL}${wikiGenre}_music`;
    const fallbackUrl = `${BASE_URL}${wikiGenre}`;
    let result = await scrape(url, fallbackUrl);
    if (result && result.disamLink && result.disambiguation) {
        const newURL = `https://en.wikipedia.org${result.disamLink}`;
        result = await scrape(newURL, newURL);
    }

    if (!result || !result.text) {
        console.log(`No suitable paragraph found for ${genre}.`);
        return '';
    }

    return result.text;
}

async function scrape(url: string, fallback: string) {
    try {
        let html = await fetchWithFallback(url, fallback);
        if (!html) throw new Error('Could not fetch wiki html');
        const $ = cheerio.load(html);

        $('style').remove();

        const $pElements = $('p:not(.mw-empty-elt)');
        let text = '';

        let disambiguation = false;
        let disamLink;
        $pElements.each((_, el) => {
            let candidate = $(el).text().replace(/\[(\d*|citation needed?)\]/g, '').trim();
            if (candidate.includes('may refer to')) {
                disambiguation = true;
            }
            if (disambiguation) {
                const $liElements = $('li');
                $liElements.each((_, li) => {
                    if ($(li).text().toLowerCase().includes('genre') && $(li).text().toLowerCase().includes('music')) {
                        disamLink = $(li).find('a').attr('href');
                        return false;
                    }
                })
            }

            // Skip if:
            // - shorter than 3 chars
            // - starts with coordinate info (usually hidden visually but present in HTML)
            // - starts with "This article is about"
            // - starts with "For" (Wikipedia disambiguation style)
            // - contains only punctuation or whitespace
            if (
                disambiguation ||
                candidate.length < 3 ||
                /^\s*\(.*\)\s*$/.test(candidate) ||
                /^Coordinates:/.test(candidate) ||
                /^This article is about/i.test(candidate) ||
                /^For\b/i.test(candidate) ||
                /^[\s.,;:()]+$/.test(candidate)
            ) {
                return; // continue to next <p>
            }
            text = candidate;
            return false; // stop after first valid paragraph
        });

        return { text, disambiguation, disamLink };
    } catch (err) {
        console.error(err);
    }
}

async function fetchWithFallback(primaryUrl: string, fallbackUrl: string) {
    let html = await tryFetch(primaryUrl);
    if (!html) {
        html = await tryFetch(fallbackUrl);
        if (!html) {
            console.log(`No Wikipedia article for ${primaryUrl}.`);
        }
    }
    return html;
}

async function tryFetch(url: string) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    if ($('.noarticletext').length > 0) return null;
    return html;
}

async function main() {
    const genre = '2-step';
    const result = await wikiScrape(genre);
    console.log('Wikipedia for', genre);
    console.log(result);
}

//main().catch((err) => console.log(err));
