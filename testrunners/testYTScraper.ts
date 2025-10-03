/**
 * Super-basic tester:
 * - Takes an array of search terms and a delay (ms)
 * - For each term, builds a YouTube search URL
 * - Follows redirects manually and PRINTS the HTTP status for EVERY hop
 * - Stops on first 2xx and reports success/failure
 *
 * Node 18+ (global fetch). Run with: ts-node thisfile.ts
 */

type TestOptions = {
    gl?: string;          // region
    hl?: string;          // language
    timeoutMs?: number;   // per-request timeout
    redirectLimit?: number;
};

export async function testYouTubeSearchStatuses(
    terms: string[],
    delayMs: number,
    opts: TestOptions = {}
) {
    const {
        gl = "US",
        hl = "en",
        timeoutMs = 10_000,
        redirectLimit = 10,
    } = opts;

    for (let i = 0; i < terms.length; i++) {
        const q = terms[i].trim();
        const url = buildSearchUrl(q, gl, hl);
        console.log(`\n=== [${i + 1}/${terms.length}] "${q}" ===`);
        await hitAndLogAllStatuses(url, { timeoutMs, redirectLimit });

        if (i < terms.length - 1 && delayMs > 0) {
            await sleep(randomDelay(delayMs));
        }
    }
}

function buildSearchUrl(q: string, gl: string, hl: string) {
    // sp=EgIQAQ%3D%3D narrows to "Videos" tab
    const base = "https://www.youtube.com/results";
    const u = new URL(base);
    u.searchParams.set("search_query", q);
    u.searchParams.set("sp", "EgIQAQ%3D%3D");
    u.searchParams.set("persist_gl", "1");
    u.searchParams.set("gl", gl);
    u.searchParams.set("persist_hl", "1");
    u.searchParams.set("hl", hl);
    return u.toString();
}

async function hitAndLogAllStatuses(
    startUrl: string,
    args: { timeoutMs: number; redirectLimit: number }
) {
    const { timeoutMs, redirectLimit } = args;

    let url = startUrl;
    const seen = new Set<string>();

    for (let hop = 0; hop < redirectLimit; hop++) {
        if (seen.has(url)) {
            console.error(`  [hop ${hop}] redirect loop detected at ${url}`);
            return;
        }
        seen.add(url);

        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);

        try {
            const res = await fetch(url, {
                method: "GET",
                redirect: "manual", // so we can log each hop
                signal: ctrl.signal,
                headers: {
                    // random-ish but static UA is fine for this super-basic tester
                    "User-Agent":
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept":
                        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    // optional: seed CONSENT to avoid EU loops (comment out if not wanted)
                    Cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+678; PREF=f6=40000000",
                },
            });

            const location = res.headers.get("location");
            console.log(
                `  [hop ${hop}] ${res.status} ${res.statusText}${
                    location ? ` -> Location: ${new URL(location, url).toString()}` : ""
                }`
            );

            // Redirect (3xx): move to next hop
            if (res.status >= 300 && res.status < 400 && location) {
                url = new URL(location, url).toString();
                continue;
            }

            // If we got any non-redirect response, we're done.
            if (res.ok) {
                console.log("  ✅ final: OK (2xx) — fetched search HTML");
            } else {
                console.log(`  ❌ final: non-OK status (${res.status})`);
            }
            return;
        } catch (err: any) {
            const msg = err?.name === "AbortError"
                ? `timeout after ${timeoutMs}ms`
                : String(err?.message || err);
            console.error(`  [hop ${hop}] error: ${msg}`);
            return;
        } finally {
            clearTimeout(t);
        }
    }

    console.error(`  ❌ redirect count exceeded (${redirectLimit})`);
}

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

/* ------------------ example usage ------------------ */
// (uncomment to run directly with ts-node)
/*
(async () => {
  await testYouTubeSearchStatuses(
    [
      "Daft Punk Get Lucky",
      "Radiohead Paranoid Android",
      "Adele Hello",
    ],
    1000, // 1s delay between terms
    { timeoutMs: 8000, redirectLimit: 12 }
  );
})();
*/

const youtubeSearchQueries = [
    "lofi hip hop beats",
    "top 10 NBA plays 2024",
    "how to cook ramen",
    "Taylor Swift live concert",
    "coding tutorial JavaScript",
    "AI explained simply",
    "Minecraft speedrun world record",
    "best anime openings",
    "lofi study mix 2025",
    "funny cat videos compilation",
    "history of rock music",
    "Marvel Avengers trailer",
    "chill guitar backing track",
    "how to use MongoDB",
    "React tutorial full course",
    "space documentary 4k",
    "top 100 songs 2025",
    "DIY desk setup ideas",
    "best soccer goals",
    "Pokémon soundtrack playlist",
    "Star Wars theory",
    "metal guitar riff tutorial",
    "Linux kernel explained",
    "productivity tips Notion",
    "gaming highlights 2025",
    "best rap songs of all time",
    "lofi vibes 1 hour",
    "calming piano music",
    "C++ beginner tutorial",
    "unreal engine demo",
    "funny fails compilation",
    "film scoring tutorial",
    "classical music for studying",
    "guitar tone comparison",
    "Apple keynote highlights",
    "coding interview prep",
    "top 10 chess moves",
    "ultimate FIFA goals",
    "learn TypeScript in 1 hour",
    "documentary on AI",
    "best guitar solos",
    "Java tutorial full course",
    "building a PC 2025",
    "best NBA dunks",
    "mixing vocals tutorial",
    "history of video games",
    "Beatles full album",
    "drone footage 4k",
    "DIY synth project",
    "calisthenics workout routine",
    "new movie trailers 2025",
    "90s hip hop playlist",
    "CSS grid tutorial",
    "best EDM drops",
    "comedy skits 2025",
    "motivational speech",
    "learn Python basics",
    "street food tour Tokyo",
    "Pokémon gameplay",
    "unboxing iPhone",
    "cinematic film music",
    "K-pop dance practice",
    "relaxing jazz music",
    "top 10 anime fights",
    "Adobe Photoshop tutorial",
    "funny dog videos",
    "deep house mix",
    "Harry Potter soundtrack",
    "LoL Worlds finals highlights",
    "DIY pedalboard setup",
    "quantum physics explained",
    "best acoustic songs",
    "chess openings explained",
    "AI music generation demo",
    "indie rock mix",
    "coding bootcamp crash course",
    "sound design tutorial",
    "trailer mashup 2025",
    "spaceX launch live",
    "romantic piano music",
    "funny TikTok compilation",
    "DJ mix techno",
    "retro gaming review",
    "movie behind the scenes",
    "Django web dev tutorial",
    "Pokémon speedrun",
    "DIY guitar pedal",
    "lofi guitar mix",
    "best basketball crossovers",
    "LoZ soundtrack",
    "how to use Docker",
    "JavaScript animations tutorial",
    "top 10 guitar intros",
    "gaming memes 2025",
    "F1 highlights 2025",
    "street workout motivation",
    "ambient electronic mix",
    "new music releases",
    "Python AI project",
    "best drum solos",
    "Call of Duty montage",
    "Node.js crash course",
    "film editing tutorial",
    "classic Disney songs",
    "philosophy explained",
    "crazy science experiments",
    "Spotify playlist mix",
    "drum and bass mix",
    "Elden Ring gameplay",
    "top TikTok songs 2025",
    "K-pop mashup",
    "unreal engine 5 tutorial",
    "new anime trailers",
    "guitar effects explained",
    "street food New York",
    "lofi beats to sleep",
    "coding with React",
    "tech news update",
    "funny stand up comedy",
    "drum cover metal",
    "pop hits 2025",
    "how to mix a song",
    "gaming keyboard review",
    "legendary rock concerts",
    "DJ set house music",
    "DIY Arduino project",
    "relaxing guitar instrumental",
    "top 10 NBA buzzer beaters",
    "Harry Styles live",
    "open source explained",
    "programming meme compilation",
    "retro synthwave mix",
    "history of hip hop",
    "Epic orchestral music",
    "JavaScript promises explained",
    "World Cup highlights",
    "guitar amp shootout",
    "funny baby videos",
    "study motivation music",
    "building a REST API",
    "Call of Duty funny moments",
    "emotional movie scenes",
    "Python machine learning intro",
    "top 10 guitar solos",
    "acoustic cover pop songs",
    "anime soundtrack mix",
    "epic fantasy music",
    "Pokémon theme song",
    "funny fails TikTok",
    "Star Wars fan edit",
    "gaming headset review",
    "Metallica live concert",
    "new Netflix trailers",
    "study with me pomodoro",
    "DIY electronics project",
    "coding portfolio tips",
    "history documentary",
    "romantic jazz music",
    "funny animals 2025",
    "NBA highlights today",
    "learn SQL in 10 minutes",
    "Kanye West playlist",
    "soundtrack mix study",
    "top esports plays",
    "philosophy lecture",
    "drum solo jazz",
    "funny vines compilation",
    "CSS animations guide",
    "acoustic love songs",
    "Pokémon Scarlet gameplay",
    "chillhop mix",
    "cyberpunk synthwave mix",
    "learn Rust programming",
    "AI music mashup"
];

const randomDelay = (delay: number, rangeFactor = 2) => {
    const lower = Math.floor(Math.min(1, delay / rangeFactor));
    const upper = Math.floor(delay * rangeFactor);
    return Math.floor(Math.random() * (upper - lower));
}

if (require.main === module) {
    testYouTubeSearchStatuses(youtubeSearchQueries, 2000)
}