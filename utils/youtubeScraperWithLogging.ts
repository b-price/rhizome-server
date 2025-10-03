/**
 * Search YouTube for "artist + song" and return the first video's ID.
 * - Returns `string | undefined` (never null)
 * - Verbose logging on *every* failure path
 * - Randomized User-Agent, manual redirects, tiny cookie jar
 * - Seeds CONSENT cookie to avoid EU consent loops
 * - Optional mobile fallback
 *
 * Requires Node 18+ (global fetch) or polyfill.
 */

export async function getFirstYouTubeVideoIDLogs(
    artistName: string,
    songTitle: string,
    opts?: {
        retries?: number;            // default 2 (total attempts per endpoint)
        backoffMs?: number;          // default 600 (exponential with jitter)
        gl?: string;                 // default 'US'
        hl?: string;                 // default 'en'
        timeoutMs?: number;          // default 15000 per HTTP attempt
        redirectLimit?: number;      // default 8
        mobileFallback?: boolean;    // default true (try m.youtube.com if desktop fails)
        logPrefix?: string;          // default '[yt-scraper]'
    }
): Promise<string | undefined> {
    const {
        retries = 2,
        backoffMs = 600,
        gl = "US",
        hl = "en",
        timeoutMs = 15_000,
        redirectLimit = 8,
        mobileFallback = true,
        logPrefix = "[yt-scraper]",
    } = opts ?? {};

    const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Firefox/115.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13.0; rv:117.0) Gecko/20100101 Firefox/117.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36 Edg/118.0",
    ];

    const query = `${artistName} ${songTitle}`.trim();

    // Desktop search URL (Videos tab + persisted locale)
    const desktopURL = buildSearchUrl("https://www.youtube.com/results", query, gl, hl);
    // Mobile fallback URL
    const mobileURL  = buildSearchUrl("https://m.youtube.com/results", query, gl, hl);

    // Try desktop first
    const vidDesktop = await attemptEndpoint(desktopURL, "desktop");
    if (vidDesktop) return vidDesktop;

    if (mobileFallback) {
        console.warn(`${logPrefix} desktop failed — attempting mobile fallback`);
        const vidMobile = await attemptEndpoint(mobileURL, "mobile");
        if (vidMobile) return vidMobile;
    }

    console.error(`${logPrefix} all attempts failed — returning undefined`);
    return undefined;

    // ----------------- helpers -----------------

    function buildSearchUrl(base: string, q: string, gl: string, hl: string) {
        // sp=EgIQAQ%3D%3D narrows to "Videos" tab; persist_gl/hl reduce locale redirects
        const sp = "EgIQAQ%3D%3D";
        const u = new URL(base);
        u.searchParams.set("search_query", q);
        u.searchParams.set("sp", sp);
        u.searchParams.set("persist_gl", "1");
        u.searchParams.set("gl", gl);
        u.searchParams.set("persist_hl", "1");
        u.searchParams.set("hl", hl);
        return u.toString();
    }

    async function attemptEndpoint(startUrl: string, label: "desktop" | "mobile"): Promise<string | undefined> {
        const jar = new Map<string, Record<string, string>>();

        // Seed cookies to skip consent & reduce experiments
        setCookie(jar, "youtube.com", "CONSENT", "YES+cb.20210328-17-p0.en+FX+678");
        setCookie(jar, "youtube.com", "PREF", "f6=40000000");

        for (let attempt = 0; attempt <= retries; attempt++) {
            const ua = randomUA();
            try {
                const vid = await fetchOnceWithRedirects({
                    startUrl,
                    label,
                    ua,
                    timeoutMs,
                    redirectLimit,
                    jar,
                });
                if (!vid) {
                    console.error(`${logPrefix} ${label} attempt ${attempt + 1}/${retries + 1}: no video found — stopping retries for this endpoint`);
                    return undefined; // No point retrying parse success but empty
                }
                return vid;
            } catch (e: any) {
                const msg = String(e?.message || e);
                console.error(`${logPrefix} ${label} attempt ${attempt + 1}/${retries + 1} failed: ${msg}`);
                if (attempt < retries && isRetryable(msg)) {
                    const delay = jitter(backoffMs * Math.pow(2, attempt));
                    console.warn(`${logPrefix} retrying ${label} in ${Math.round(delay)}ms`);
                    await sleep(delay);
                    continue;
                }
                console.error(`${logPrefix} ${label} giving up after ${attempt + 1} attempt(s)`);
                return undefined;
            }
        }
        return undefined;
    }

    function isRetryable(msg: string) {
        return (
            /Transient HTTP/i.test(msg) ||
            /timeout/i.test(msg) ||
            /aborted/i.test(msg) ||
            /network/i.test(msg) ||
            /redirect/i.test(msg) ||   // redirect loops
            /consent/i.test(msg)
        );
    }

    async function fetchOnceWithRedirects(args: {
        startUrl: string;
        label: string;
        ua: string;
        timeoutMs: number;
        redirectLimit: number;
        jar: Map<string, Record<string, string>>;
    }): Promise<string | undefined> {
        const { startUrl, label, ua, timeoutMs, redirectLimit, jar } = args;

        let url = startUrl;
        const seen = new Set<string>();

        for (let hop = 0; hop < redirectLimit; hop++) {
            if (seen.has(url)) {
                const msg = `redirect loop detected at hop ${hop} for ${url}`;
                console.error(`${logPrefix} ${label}: ${msg}`);
                throw new Error(`redirect: ${msg}`);
            }
            seen.add(url);

            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), timeoutMs);

            try {
                const res = await fetch(url, {
                    method: "GET",
                    redirect: "manual",
                    signal: ctrl.signal,
                    headers: {
                        "User-Agent": ua,
                        "Accept-Language": `${hl},en;q=0.9`,
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                        ...(cookieHeader(jar, url) ? { Cookie: cookieHeader(jar, url)! } : {}),
                    },
                });

                // Capture Set-Cookie (Node fetch exposes raw() on Headers in undici polyfills)
                const setCookie = (res.headers as any).raw ? (res.headers as any).raw()["set-cookie"] : undefined;
                ingestSetCookies(jar, url, setCookie);

                // Redirect?
                if (res.status >= 300 && res.status < 400) {
                    const loc = res.headers.get("location");
                    if (!loc) {
                        console.error(`${logPrefix} ${label}: redirect with no Location (HTTP ${res.status}) from ${url}`);
                        throw new Error(`redirect: missing Location (HTTP ${res.status})`);
                    }
                    const next = new URL(loc, url).toString();
                    console.info(`${logPrefix} ${label}: redirect ${hop + 1}/${redirectLimit} ${res.status} -> ${next}`);

                    // If consent bounce, skip to original start (we seed CONSENT already)
                    if (/consent\.youtube\.com/i.test(next)) {
                        console.warn(`${logPrefix} ${label}: encountered consent redirect; forcing back to start URL`);
                        url = startUrl;
                    } else {
                        url = next;
                    }
                    continue; // next hop
                }

                // Transient server errors
                if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
                    console.error(`${logPrefix} ${label}: transient HTTP ${res.status} from ${url}`);
                    throw new Error(`Transient HTTP ${res.status}`);
                }

                if (!res.ok) {
                    console.error(`${logPrefix} ${label}: non-OK HTTP ${res.status} from ${url}`);
                    return undefined;
                }

                const html = await res.text();
                const data = extractYtInitialData(html);
                if (!data) {
                    console.error(`${logPrefix} ${label}: failed to parse ytInitialData from ${url}`);
                    return undefined;
                }

                const videoId = findFirstVideoId(data);
                if (!videoId) {
                    console.error(`${logPrefix} ${label}: parsed ytInitialData but found no videoRenderer.videoId`);
                    return undefined;
                }

                console.info(`${logPrefix} ${label}: success videoId=${videoId}`);
                return videoId;
            } catch (err: any) {
                if (err?.name === "AbortError") {
                    console.error(`${logPrefix} ${label}: request aborted (timeout ${timeoutMs} ms) at ${url}`);
                    throw new Error(`timeout: aborted after ${timeoutMs}ms`);
                }
                const msg = String(err?.message || err);
                console.error(`${logPrefix} ${label}: network/error at ${url}: ${msg}`);
                throw err;
            } finally {
                clearTimeout(t);
            }
        }

        console.error(`${logPrefix} ${label}: redirect count exceeded (${redirectLimit})`);
        throw new Error(`redirect: count exceeded (${redirectLimit})`);
    }

    // ----------------- tiny cookie jar -----------------

    function setCookie(jar: Map<string, Record<string, string>>, domainLike: string, name: string, value: string) {
        const d = domainLike.replace(/^https?:\/\//, "").split("/")[0];
        if (!jar.has(d)) jar.set(d, {});
        jar.get(d)![name] = value;
    }

    function cookieHeader(jar: Map<string, Record<string, string>>, url: string) {
        const host = new URL(url).hostname;
        const parent = host.split(".").slice(-2).join(".");
        const bag = { ...(jar.get(parent) || {}), ...(jar.get(host) || {}) };
        const entries = Object.entries(bag);
        return entries.length ? entries.map(([k, v]) => `${k}=${v}`).join("; ") : undefined;
    }

    function ingestSetCookies(
        jar: Map<string, Record<string, string>>,
        requestUrl: string,
        setCookieHeaders: string[] | undefined
    ) {
        if (!setCookieHeaders?.length) return;
        const host = new URL(requestUrl).hostname;
        for (const sc of setCookieHeaders) {
            // "NAME=VALUE; Path=/; Domain=.youtube.com; Expires=...; Secure; HttpOnly"
            const [nv, ...attrs] = sc.split(";");
            const [name, ...rest] = nv.split("=");
            const value = rest.join("=");
            if (!name || !value) continue;
            const domainAttr = attrs.find(a => a.trim().toLowerCase().startsWith("domain="));
            const domain = (domainAttr ? domainAttr.split("=")[1].trim().replace(/^\./, "") : host);
            setCookie(jar, domain, name.trim(), value.trim());
        }
    }

    // ----------------- UA, sleep, jitter -----------------


    function randomUA() {
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }
    function sleep(ms: number) {
        return new Promise((r) => setTimeout(r, ms));
    }
    function jitter(baseMs: number) {
        return baseMs * (1 + Math.random() * 0.5);
    }

    // ----------------- parsers -----------------

    function extractYtInitialData(html: string): any | undefined {
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
                } catch (e) {
                    console.error(`${logPrefix} parser: JSON.parse failed for matched ytInitialData: ${(e as Error).message}`);
                }
            }
        }
        return undefined;
    }

    function findFirstVideoId(root: any): string | undefined {
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
        return undefined;
    }
}
