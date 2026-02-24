import {artistNamesMatch, normalizeArtistName} from "../utils/parsing";

describe("normalizeArtistName", () => {
    test("ignores case", () => {
        expect(normalizeArtistName("RadioHead")).toBe(normalizeArtistName("radiohead"));
    });

    test("removes whitespace (including multiple spaces)", () => {
        expect(normalizeArtistName("Red   Hot Chili   Peppers")).toBe(
            normalizeArtistName("RedHotChiliPeppers")
        );
    });

    test('removes whole-word "the" and "and" (word boundaries)', () => {
        expect(normalizeArtistName("The Beatles")).toBe("beatles");
        expect(normalizeArtistName("Florence and the Machine")).toBe("florencemachine");

        // Ensure we do NOT remove "the" when it's part of another word
        expect(normalizeArtistName("Therapy?")).toBe("therapy?");
        // Note: "?" is not removed by our punctuation list, so it remains.
    });

    test("removes only the specified punctuation: , . ' \" ! - _ + &", () => {
        expect(normalizeArtistName(`Guns N' Roses`)).toBe("gunsnroses");
        expect(normalizeArtistName(`P!nk`)).toBe("pnk");
        expect(normalizeArtistName(`AC-DC`)).toBe("acdc");
        expect(normalizeArtistName(`Jay_Z`)).toBe("jayz");
        expect(normalizeArtistName(`A+B`)).toBe("ab");
        expect(normalizeArtistName(`Simon & Garfunkel`)).toBe("simongarfunkel");
        expect(normalizeArtistName(`Hello, World.`)).toBe("helloworld");
        expect(normalizeArtistName(`"Quoted"`)).toBe("quoted");
    });

    test("does not remove punctuation not in the list", () => {
        // Slash is NOT in the list, so it remains
        expect(normalizeArtistName("AC/DC")).toBe("ac/dc");

        // Question mark is NOT in the list, so it remains
        expect(normalizeArtistName("Therapy?")).toBe("therapy?");
    });

    test("treats letters with/without diacritics as equal (NFD + combining marks removed)", () => {
        expect(normalizeArtistName("Beyoncé")).toBe(normalizeArtistName("Beyonce"));
        expect(normalizeArtistName("Mötley Crüe")).toBe(normalizeArtistName("Motley Crue"));
        expect(normalizeArtistName("Sigur Rós")).toBe(normalizeArtistName("Sigur Ros"));
    });

    test("order of operations works: remove words then punctuation/whitespace", () => {
        expect(normalizeArtistName("  The   xx  ")).toBe("xx");
        expect(normalizeArtistName("A-ha")).toBe("aha");
    });
});

describe("artistNamesMatch", () => {
    test("matches when differences are only case/whitespace", () => {
        expect(artistNamesMatch("  Daft Punk", "daft   punk ")).toBe(true);
    });

    test("matches when differences include ignored words", () => {
        expect(artistNamesMatch("The Killers", "Killers")).toBe(true);
        expect(artistNamesMatch("Florence and the Machine", "Florence Machine")).toBe(true);
    });

    test("matches when differences include specified punctuation", () => {
        expect(artistNamesMatch(`Guns N' Roses`, "Guns N Roses")).toBe(true);
        expect(artistNamesMatch("Simon & Garfunkel", "Simon Garfunkel")).toBe(true);
        expect(artistNamesMatch("AC-DC", "ACDC")).toBe(true);
        expect(artistNamesMatch("P!nk", "Pnk")).toBe(true);
    });

    test("matches when differences include diacritics", () => {
        expect(artistNamesMatch("Beyoncé", "Beyonce")).toBe(true);
        expect(artistNamesMatch("Zoë", "Zoe")).toBe(true);
    });

    test("does NOT match when differences include non-ignored punctuation", () => {
        // Slash not ignored
        expect(artistNamesMatch("AC/DC", "ACDC")).toBe(false);
    });

    test("does NOT match when names are genuinely different", () => {
        expect(artistNamesMatch("Radiohead", "Rihanna")).toBe(false);
        expect(artistNamesMatch("The Strokes", "The Stone Roses")).toBe(false);
    });

    test("word boundary correctness: 'the'/'and' inside words should not be stripped", () => {
        // "Therapy" contains "the" but not as a whole word
        expect(artistNamesMatch("Therapy?", "rapy?")).toBe(false);
        expect(artistNamesMatch("Anderson .Paak", "erson .Paak")).toBe(false);
    });

    test("handles tricky combinations together", () => {
        expect(artistNamesMatch(`  The   Béyoncé!  `, "beyonce")).toBe(true);
        expect(artistNamesMatch(`Simon & Garfunkel`, `SIMON  GARFUNKEL`)).toBe(true);
        expect(artistNamesMatch(`Florence-and_the Machine`, `florence machine`)).toBe(true);
    });
});describe('parsing tests', () => {

    test('', () => {
        expect(true).toBe(true);
    });
});