import {collections} from "../db/connection";
import {Artist, Genre, ParentField, LinkType} from "../types";
import {createArtistLinksLessCPU, createArtistLinksLessMemory} from "../utils/createArtistLinks";

export async function getAllGenresFromDB() {
    return await collections.genres?.find({}).toArray();
}

export async function getAllGenreData() {
    return {
        genres: await getAllGenresFromDB(),
        links: await getGenreLinksFromDB(),
    };
}

export async function getGenreArtistsFromDB(genreID: string) {
    return await collections.artists?.find({ genres: genreID }).toArray();
}

export async function getGenreArtistData(genreID: string) {
    const artists = await getGenreArtistsFromDB(genreID);
    return {
        artists,
        links: createArtistLinksLessCPU(artists as unknown as Artist[]),
    }
}

export async function searchArtists(name: string) {
    return await collections.artists?.find({ name }).toArray();
}

export async function searchGenres(name: string) {
    return await collections.genres?.find({ name }).toArray();
}

export async function getGenreNameFromID(genreID: string) {
    return await collections.genres?.findOne({ id: genreID });
}

export async function getSimilarArtistsFromArray(artists: string[]) {
    const similarArtists: Artist[] = [];
    for (const artist of artists) {
        const similarArtist = await collections.artists?.findOne({name: artist}) as unknown as Artist;
        if (similarArtist) {
            similarArtists.push(similarArtist);
        }
    }
    return similarArtists;
}

export async function searchDB(query: string) {
    const searchQuery = { $text: { $search: query } };
    let genreResults = await collections.genres?.find(searchQuery).limit(10).toArray();
    let artistResults = await collections.artists?.find(searchQuery).limit(10).toArray();
    if (!genreResults) genreResults = [];
    if (!artistResults) artistResults = [];
    return [...artistResults, ...genreResults];
}

export async function getArtistByName(name: string) {
    return await collections.artists?.findOne({ name: name });
}

export async function getSimilarArtistsFromArtist(artistId: string) {
    const artist = await collections.artists?.findOne({ id: artistId });
    let similarArtists: Artist[] = [];
    if (artist) {
        const simArtistNames = artist.similar;
        if (simArtistNames && simArtistNames.length) {
            similarArtists = await getSimilarArtistsFromArray(simArtistNames);
        }
    }
    return similarArtists;
}

export async function getNoParentGenreArtists(genreID: string, linkType: ParentField) {
    const childGenres = await getGenreTreeFromParent(genreID, linkType);
    if (childGenres && childGenres.length) {
        const childGenreIDs = childGenres.map(genre => genre.id);
        return await collections.artists?.find({
            genres: { $in: childGenreIDs, $nin: [genreID] }
        }).toArray();
    }
    return [];
}

export async function getParentOnlyArtists(genreID: string, linkType: ParentField) {
    const childGenres = await getGenreTreeFromParent(genreID, linkType);
    if (childGenres && childGenres.length) {
        const childGenreIDs = childGenres.map(genre => genre.id);
        return await collections.artists?.find({$and: [{genres: genreID}, {genres: { $nin: [...childGenreIDs]}}]}).toArray();
    }
    return [];
}

export async function getGenreTreeFromParent(
    genreID: string,
    linkField: ParentField = "subgenre_of",
) {
    const cursor = collections.genres?.aggregate([
        { $match: { id: genreID } },
        {
            $graphLookup: {
                from: "Genres",
                startWith: "$id",
                connectFromField: "id",
                connectToField: `${linkField}.id`,
                as: "descendants",
                depthField: "depth",
                // Optional: keep the search tight
                // restrictSearchWithMatch: { [linkField]: { $exists: true, $ne: [] } }
            },
        },
        { $project: { _id: 0, descendants: 1 } },
        { $unwind: "$descendants" },
        { $replaceRoot: { newRoot: "$descendants" } },
    ]);

    return (await cursor?.toArray()) ?? [];
}

export async function getGenreLinksFromDB() {
    return await collections.genres?.aggregate([
        {
            // Build all candidate links (both directions per field family), then canonicalize
            $project: {
                links: {
                    $concatArrays: [
                        // --- subgenre ---
                        {
                            $map: {
                                input: { $ifNull: ["$subgenres", []] },
                                as: "r",
                                in: {
                                    $let: {
                                        vars: {
                                            a: { $convert: { input: "$id", to: "string", onNull: "", onError: "" } },
                                            b: {
                                                // handle cases where $$r is an object-with-id or an ObjectId, or already a string
                                                $cond: [
                                                    { $eq: [{ $type: "$$r.id" }, "object"] },
                                                    { $convert: { input: "$$r.id.id", to: "string", onNull: "", onError: "" } },
                                                    { $convert: { input: "$$r.id",    to: "string", onNull: "", onError: "" } }
                                                ]
                                            },
                                            t: "subgenre" // or "influence"/"fusion" in those blocks
                                        },
                                        in: {
                                            source: { $cond: [{ $lte: ["$$a", "$$b"] }, "$$a", "$$b"] },
                                            target: { $cond: [{ $lte: ["$$a", "$$b"] }, "$$b", "$$a"] },
                                            linkType: "$$t",
                                            uKey: { $concat: ["$$t", "|", { $cond: [{ $lte: ["$$a", "$$b"] }, "$$a", "$$b"] }, "|", { $cond: [{ $lte: ["$$a", "$$b"] }, "$$b", "$$a"] }] }
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $map: {
                                input: { $ifNull: ["$subgenre_of", []] },
                                as: "r",
                                in: {
                                    $let: {
                                        vars: {
                                            a: { $convert: { input: "$id", to: "string", onNull: "", onError: "" } },
                                            b: {
                                                // handle cases where $$r is an object-with-id or an ObjectId, or already a string
                                                $cond: [
                                                    { $eq: [{ $type: "$$r.id" }, "object"] },
                                                    { $convert: { input: "$$r.id.id", to: "string", onNull: "", onError: "" } },
                                                    { $convert: { input: "$$r.id",    to: "string", onNull: "", onError: "" } }
                                                ]
                                            },
                                            t: "subgenre" // or "influence"/"fusion" in those blocks
                                        },
                                        in: {
                                            source: { $cond: [{ $lte: ["$$a", "$$b"] }, "$$a", "$$b"] },
                                            target: { $cond: [{ $lte: ["$$a", "$$b"] }, "$$b", "$$a"] },
                                            linkType: "$$t",
                                            uKey: { $concat: ["$$t", "|", { $cond: [{ $lte: ["$$a", "$$b"] }, "$$a", "$$b"] }, "|", { $cond: [{ $lte: ["$$a", "$$b"] }, "$$b", "$$a"] }] }
                                        }
                                    }
                                }
                            }
                        },

                        // --- influence ---
                        {
                            $map: {
                                input: { $ifNull: ["$influenced_genres", []] },
                                as: "r",
                                in: {
                                    $let: {
                                        vars: {
                                            a: { $convert: { input: "$id", to: "string", onNull: "", onError: "" } },
                                            b: {
                                                // handle cases where $$r is an object-with-id or an ObjectId, or already a string
                                                $cond: [
                                                    { $eq: [{ $type: "$$r.id" }, "object"] },
                                                    { $convert: { input: "$$r.id.id", to: "string", onNull: "", onError: "" } },
                                                    { $convert: { input: "$$r.id",    to: "string", onNull: "", onError: "" } }
                                                ]
                                            },
                                            t: "influence" // or "influence"/"fusion" in those blocks
                                        },
                                        in: {
                                            source: { $cond: [{ $lte: ["$$a", "$$b"] }, "$$a", "$$b"] },
                                            target: { $cond: [{ $lte: ["$$a", "$$b"] }, "$$b", "$$a"] },
                                            linkType: "$$t",
                                            uKey: { $concat: ["$$t", "|", { $cond: [{ $lte: ["$$a", "$$b"] }, "$$a", "$$b"] }, "|", { $cond: [{ $lte: ["$$a", "$$b"] }, "$$b", "$$a"] }] }
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $map: {
                                input: { $ifNull: ["$influenced_by", []] },
                                as: "r",
                                in: {
                                    $let: {
                                        vars: {
                                            a: { $convert: { input: "$id", to: "string", onNull: "", onError: "" } },
                                            b: {
                                                // handle cases where $$r is an object-with-id or an ObjectId, or already a string
                                                $cond: [
                                                    { $eq: [{ $type: "$$r.id" }, "object"] },
                                                    { $convert: { input: "$$r.id.id", to: "string", onNull: "", onError: "" } },
                                                    { $convert: { input: "$$r.id",    to: "string", onNull: "", onError: "" } }
                                                ]
                                            },
                                            t: "influence" // or "influence"/"fusion" in those blocks
                                        },
                                        in: {
                                            source: { $cond: [{ $lte: ["$$a", "$$b"] }, "$$a", "$$b"] },
                                            target: { $cond: [{ $lte: ["$$a", "$$b"] }, "$$b", "$$a"] },
                                            linkType: "$$t",
                                            uKey: { $concat: ["$$t", "|", { $cond: [{ $lte: ["$$a", "$$b"] }, "$$a", "$$b"] }, "|", { $cond: [{ $lte: ["$$a", "$$b"] }, "$$b", "$$a"] }] }
                                        }
                                    }
                                }
                            }
                        },

                        // --- fusion ---
                        {
                            $map: {
                                input: { $ifNull: ["$fusion_genres", []] },
                                as: "r",
                                in: {
                                    $let: {
                                        vars: {
                                            a: { $convert: { input: "$id", to: "string", onNull: "", onError: "" } },
                                            b: {
                                                // handle cases where $$r is an object-with-id or an ObjectId, or already a string
                                                $cond: [
                                                    { $eq: [{ $type: "$$r.id" }, "object"] },
                                                    { $convert: { input: "$$r.id.id", to: "string", onNull: "", onError: "" } },
                                                    { $convert: { input: "$$r.id",    to: "string", onNull: "", onError: "" } }
                                                ]
                                            },
                                            t: "fusion" // or "influence"/"fusion" in those blocks
                                        },
                                        in: {
                                            source: { $cond: [{ $lte: ["$$a", "$$b"] }, "$$a", "$$b"] },
                                            target: { $cond: [{ $lte: ["$$a", "$$b"] }, "$$b", "$$a"] },
                                            linkType: "$$t",
                                            uKey: { $concat: ["$$t", "|", { $cond: [{ $lte: ["$$a", "$$b"] }, "$$a", "$$b"] }, "|", { $cond: [{ $lte: ["$$a", "$$b"] }, "$$b", "$$a"] }] }
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $map: {
                                input: { $ifNull: ["$fusion_of", []] },
                                as: "r",
                                in: {
                                    $let: {
                                        vars: {
                                            a: { $convert: { input: "$id", to: "string", onNull: "", onError: "" } },
                                            b: {
                                                // handle cases where $$r is an object-with-id or an ObjectId, or already a string
                                                $cond: [
                                                    { $eq: [{ $type: "$$r.id" }, "object"] },
                                                    { $convert: { input: "$$r.id.id", to: "string", onNull: "", onError: "" } },
                                                    { $convert: { input: "$$r.id",    to: "string", onNull: "", onError: "" } }
                                                ]
                                            },
                                            t: "fusion" // or "influence"/"fusion" in those blocks
                                        },
                                        in: {
                                            source: { $cond: [{ $lte: ["$$a", "$$b"] }, "$$a", "$$b"] },
                                            target: { $cond: [{ $lte: ["$$a", "$$b"] }, "$$b", "$$a"] },
                                            linkType: "$$t",
                                            uKey: { $concat: ["$$t", "|", { $cond: [{ $lte: ["$$a", "$$b"] }, "$$a", "$$b"] }, "|", { $cond: [{ $lte: ["$$a", "$$b"] }, "$$b", "$$a"] }] }
                                        }
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        },
        // Drop empties/self-loops just in case
        {
            $project: {
                links: {
                    $filter: {
                        input: "$links",
                        as: "l",
                        cond: {
                            $and: [
                                { $ne: ["$$l.source", null] },
                                { $ne: ["$$l.target", null] },
                                { $ne: ["$$l.source", ""] },
                                { $ne: ["$$l.target", ""] },
                                { $ne: ["$$l.source", "$$l.target"] }
                            ]
                        }
                    }
                }
            }
        },
        { $unwind: "$links" },
        // De-duplicate across the whole collection (ignoring direction per linkType)
        { $group: { _id: "$links.uKey", link: { $first: "$links" } } },
        { $replaceRoot: { newRoot: { source: "$link.source", target: "$link.target", linkType: "$link.linkType" } } },
        { $sort: { linkType: 1, source: 1, target: 1 } }
    ]).toArray();
}

export async function getArtistLinksDB(genreID: string) {
    return await collections.artists?.aggregate([
        // 1) Only consider source artists in the genre
        { $match: { genres: genreID } },

        // 2) Expand similar names
        {
            $project: {
                id: 1,
                similar: { $ifNull: ["$similar", []] }
            }
        },
        { $unwind: "$similar" },

        // 3) Resolve the similar name to the first matching target artist in the same genre
        {
            $lookup: {
                from: "Artists",
                let: { simName: "$similar" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$name", "$$simName"] }, // name match (uses name index)
                                    { $in: [genreID, "$genres"] }     // must also be in the genre
                                ]
                            }
                        }
                    },
                    { $sort: { id: 1 } }, // deterministic "first"
                    { $limit: 1 },
                    { $project: { _id: 0, id: 1 } }
                ],
                as: "t"
            }
        },
        { $unwind: "$t" },

        // 4) Form the link (drop self-loops)
        {
            $project: {
                src: "$id",
                tgt: "$t.id",
                _id: 0
            }
        },
        { $match: { $expr: { $ne: ["$src", "$tgt"] } } },

        // 5) Canonicalize endpoints to make links undirected for de-duplication
        {
            $addFields: {
                cs: { $cond: [{ $lte: ["$src", "$tgt"] }, "$src", "$tgt"] },
                ct: { $cond: [{ $lte: ["$src", "$tgt"] }, "$tgt", "$src"] },
                linkType: { $literal: "similar" }
            }
        },
        {
            $addFields: {
                uKey: { $concat: ["similar|", "$cs", "|", "$ct"] }
            }
        },

        // 6) Global de-dup
        {
            $group: {
                _id: "$uKey",
                link: { $first: { source: "$cs", target: "$ct", linkType: "$linkType" } }
            }
        },
        { $replaceRoot: { newRoot: "$link" } },
        { $sort: { source: 1, target: 1 } }
    ]).toArray();
}