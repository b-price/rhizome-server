/**
 * Search YouTube for "artist + song" and return the first video's ID.
 * Uses randomized User-Agent to reduce fingerprinting.
 */
import {clearTimeout} from "node:timers";

export async function scrapeYouTubeID(
    artistName: string,
    songTitle: string,
    opts?: {
        retries?: number;
        backoffMs?: number;
        gl?: string;
        hl?: string;
        timeoutMs?: number;
    }
): Promise<string | undefined> {
    const {
        retries = 2,
        backoffMs = 600,
        gl = "US",
        hl = "en",
        timeoutMs = 15_000,
    } = opts ?? {};

    const query = `${artistName} ${songTitle}`.trim();
    const sp = "EgIQAQ%3D%3D"; // "Videos only" filter
    const base = "https://www.youtube.com/results";
    const url = `${base}?search_query=${encodeURIComponent(query)}&sp=${sp}&gl=${encodeURIComponent(gl)}&hl=${encodeURIComponent(hl)}`;

    // --- User Agent Pool ---
    const userAgents = [
        // Chrome Win
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        // Chrome Mac
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
        // Firefox Win
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Firefox/115.0",
        // Firefox Mac
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13.0; rv:117.0) Gecko/20100101 Firefox/117.0",
        // Safari Mac
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15",
        // Edge Win
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36 Edg/118.0",
        // Linux Chrome
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    ];
    function randomUA() {
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    async function fetchWithTimeout(resource: string): Promise<Response> {
        const ctrl = new AbortController();
        const id = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
        const res = await fetch(resource, {
                redirect: "follow",
                signal: ctrl.signal,
                headers: {
                    "User-Agent": randomUA(),
                    "Accept-Language": `${hl},en;q=0.9`,
                    "Accept":
                        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                },
            })
        //clearTimeout(id);
        return res;
        } finally {
            clearTimeout(id);
        }
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetchWithTimeout(url);
            console.log(res.status)
            if (!res.ok) {
                if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
                    if (attempt < retries) {
                        const sleepTime = backoffMs * Math.pow(2, attempt);
                        console.log(`       yt ${res.status}, trying again in ${sleepTime}`);
                        await sleep(sleepTime);
                        continue;
                    }
                }
                console.log(`       yt scrape failed with status ${res.status}: ${res.statusText}`);
                return onUndefined();
            }

            const html = await res.text();
            const data = extractYtInitialData(html);
            if (!data) {
                if (attempt < retries) {
                    const sleepTime = backoffMs * Math.pow(2, attempt);
                    console.log(`       no yt data, trying again in ${sleepTime}`);
                    await sleep(sleepTime);
                    continue;
                }
                return onUndefined();
            }

            const videoId = findFirstVideoId(data);
            return videoId ?? undefined;
        } catch (error) {
            if (attempt < retries) {
                const sleepTime = backoffMs * Math.pow(2, attempt);
                console.log(`       yt blocked, trying again in ${sleepTime}`);
                console.error(error)
                await sleep(sleepTime);
                continue;
            }
            return onUndefined();
        }
    }

    return onUndefined();

    // --- Helpers ---
    function sleep(ms: number) {
        return new Promise((r) => setTimeout(r, ms));
    }

    function extractYtInitialData(html: string): any | null {
        const patterns = [
            /var\s+ytInitialData\s*=\s*(\{.+?\})\s*;<\/script>/s,
            /window\["ytInitialData"\]\s*=\s*(\{.+?\})\s*;<\/script>/s,
            /ytInitialData\s*=\s*(\{.+?\})\s*;<\/script>/s,
        ];
        for (const re of patterns) {
            const m = html.match(re);
            if (m && m[1]) {
                try {
                    return JSON.parse(m[1]);
                } catch {}
            }
        }
        console.log('   no yt pattern matched')
        return null;
    }

    function findFirstVideoId(root: any): string | null {
        const queue: any[] = [root];
        while (queue.length) {
            const node = queue.shift();
            if (!node || typeof node !== "object") continue;
            if (node.videoRenderer?.videoId) return node.videoRenderer.videoId as string;
            for (const val of Object.values(node)) {
                if (val && typeof val === "object") queue.push(val);
            }
            if (Array.isArray(node)) for (const child of node) queue.push(child);
        }
        return null;
    }
}

function onUndefined() {
    console.log('   failed to scrape youtube')
    return undefined;
}

/**
 * Robust YouTube HTML search scraper:
 * - Randomized User-Agent
 * - Manual redirect handling with a tiny cookie jar
 * - Pre-seeds CONSENT cookie to avoid consent.youtube.com loops
 * - Jittered retries on 429/5xx
 *
 * Returns the first video's ID for "artist + song", or null.
 */

export async function getFirstYouTubeVideoId(
    artistName: string,
    songTitle: string,
    opts?: {
        retries?: number;           // default 2
        backoffMs?: number;         // default 600
        gl?: string;                // default 'US'
        hl?: string;                // default 'en'
        timeoutMs?: number;         // default 15_000
        redirectLimit?: number;     // default 8 (manual handling)
    }
): Promise<string | undefined> {
    const {
        retries = 2,
        backoffMs = 600,
        gl = "US",
        hl = "en",
        timeoutMs = 15_000,
        redirectLimit = 12,
    } = opts ?? {};

    const query = `${artistName} ${songTitle}`.trim();
    // sp=EgIQAQ%3D%3D narrows to "Videos" tab; persist_gl/hl reduce locale redirects
    const base = "https://www.youtube.com/results";
    const url0 =
        `${base}?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D` +
        `&persist_gl=1&gl=${encodeURIComponent(gl)}&persist_hl=1&hl=${encodeURIComponent(hl)}`;

    // --- Minimal cookie jar (domain-scoped string map) ---
    const jar = new Map<string, Record<string, string>>();
    function setCookie(domain: string, name: string, value: string) {
        const d = domain.replace(/^https?:\/\//, "").split("/")[0];
        if (!jar.has(d)) jar.set(d, {});
        jar.get(d)![name] = value;
    }
    function getCookieHeader(url: string) {
        const d = new URL(url).hostname;
        const bag = { ...(jar.get(d) || {}) };
        const parent = d.split(".").slice(-2).join("."); // youtube.com
        if (jar.get(parent)) Object.assign(bag, jar.get(parent));
        const entries = Object.entries(bag);
        return entries.length ? entries.map(([k, v]) => `${k}=${v}`).join("; ") : undefined;
    }
    function ingestSetCookies(url: string, setCookieHeaders: string[] | undefined) {
        if (!setCookieHeaders?.length) return;
        const d = new URL(url).hostname;
        for (const sc of setCookieHeaders) {
            // Very small parser: "NAME=VALUE; Path=/; Domain=.youtube.com; ..."
            const [nv, ...attrs] = sc.split(";");
            const [name, ...rest] = nv.split("=");
            const value = rest.join("=");
            if (!name || !value) continue;
            // Respect Domain if present; otherwise bind to current host
            const domainAttr = attrs.find(a => a.trim().toLowerCase().startsWith("domain="));
            const domain =
                domainAttr ? domainAttr.split("=")[1].trim().replace(/^\./, "") : d;
            setCookie(domain, name.trim(), value.trim());
        }
    }

    // Seed a permissive CONSENT cookie to avoid EU consent loops
    // (value format YouTube accepts; commonly used for server-side scraping)
    setCookie("youtube.com", "CONSENT", "YES+cb.20210328-17-p0.en+FX+678");

    // --- UA rotation & jitter ---
    const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Firefox/115.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13.0; rv:117.0) Gecko/20100101 Firefox/117.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36 Edg/118.0",
    ];
    const randomUA = () => userAgents[Math.floor(Math.random() * userAgents.length)];
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const jitter = (baseMs: number) => baseMs * (1 + Math.random() * 0.5);

    async function fetchOnce(startUrl: string): Promise<string | null> {
        // Manual redirect machine
        let url = startUrl;
        const seen = new Set<string>();

        for (let i = 0; i < redirectLimit; i++) {
            if (seen.has(url)) throw new Error("Redirect loop detected");
            seen.add(url);

            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), timeoutMs);
            try {
                const res = await fetch(url, {
                    method: "GET",
                    redirect: "manual", // we’ll follow ourselves
                    signal: ctrl.signal,
                    headers: {
                        "User-Agent": randomUA(),
                        "Accept-Language": `${hl},en;q=0.9`,
                        "Accept":
                            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                        ...(getCookieHeader(url) ? { Cookie: getCookieHeader(url)! } : {}),
                    },
                });

                // Capture Set-Cookie
                const setCookie = (res.headers as any).raw
                    ? (res.headers as any).raw()["set-cookie"]
                    : undefined;
                ingestSetCookies(url, setCookie);

                // Handle redirects manually
                if (res.status >= 300 && res.status < 400) {
                    const loc = res.headers.get("location");
                    if (!loc) throw new Error("Redirect with no Location");
                    // Resolve relative & keep protocol/host if needed
                    url = new URL(loc, url).toString();

                    // Special-case: consent redirect — ensure CONSENT is present (we pre-seeded already),
                    // then jump back to the original start URL to avoid bouncing on consent pages.
                    if (url.includes("consent.youtube.com")) {
                        // Re-target original results URL instead of walking consent flow
                        url = startUrl;
                    }
                    continue;
                }

                // Retry-worthy server states bubble up to the outer retry loop
                if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
                    throw new Error(`Transient HTTP ${res.status}`);
                }

                if (!res.ok) {
                    // Non-retryable
                    return null;
                }

                const html = await res.text();
                const data = extractYtInitialData(html);
                if (!data) return null;

                const videoId = findFirstVideoId(data);
                return videoId ?? null;
            } finally {
                clearTimeout(timer);
            }
        }
        throw new Error("redirect count exceeded (manual)");
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const vid = await fetchOnce(url0);
            if (vid) return vid;
            // If we got here with no exception and no vid, don’t hard-loop; just stop.
            //return onUndefined();
        } catch (e: any) {
            // Only retry on transient/network cases
            const msg = String(e?.message || e);
            const canRetry =
                msg.includes("Transient HTTP") ||
                msg.includes("network") ||
                msg.includes("aborted") ||
                msg.includes("timeout") ||
                msg.includes("redirect");
            if (attempt < retries && canRetry) {
                await sleep(jitter(backoffMs * Math.pow(2, attempt)));
                continue;
            }
            // Give up
            return onUndefined();
        }
    }

    return onUndefined();

    // --- Parsers ---
    function extractYtInitialData(html: string): any | null {
        const patterns = [
            /var\s+ytInitialData\s*=\s*(\{.+?\})\s*;<\/script>/s,
            /window\["ytInitialData"\]\s*=\s*(\{.+?\})\s*;<\/script>/s,
            /ytInitialData\s*=\s*(\{.+?\})\s*;<\/script>/s,
            /"ytInitialData"\s*:\s*(\{.+?\})\s*,\s*"ytInitialPlayerResponse"/s,
        ];
        for (const re of patterns) {
            const m = html.match(re);
            if (m?.[1]) {
                try {
                    return JSON.parse(m[1]);
                } catch {}
            }
        }
        return null;
    }

    function findFirstVideoId(root: any): string | null {
        // BFS across objects/arrays to find the first videoRenderer.videoId
        const q: any[] = [root];
        while (q.length) {
            const node = q.shift();
            if (!node || typeof node !== "object") continue;
            if (node.videoRenderer?.videoId) return node.videoRenderer.videoId as string;
            if (Array.isArray(node)) {
                for (const c of node) q.push(c);
            } else {
                for (const v of Object.values(node)) if (v && typeof v === "object") q.push(v);
            }
        }
        return null;
    }
}



// if (require.main === module) {
//     scrapeYouTubeID('nuur caraale', 'laba laba dhaanto').then((videoId: string | undefined) => {console.log(videoId)})
// }