import {collections} from "../db/connection";
import {Artist, Genre, ParentField, LinkType, FilterField, BasicItem} from "../types";
import {createArtistLinksLessCPU, createArtistLinksLessMemory} from "../utils/createArtistLinks";
import {ObjectId} from "mongodb";

export async function getAllGenresFromDB() {
    return await collections.genres?.find({}).toArray() as unknown as Genre[];
}

export async function getAllGenreData() {
    const genresStart = Date.now();
    //console.log('Fetching genres...')
    const genres = await getAllGenresFromDB();
    const genresEnd = Date.now();
    //console.log(`Genre docs took ${genresEnd - genresStart}ms`);
    const linksStart = Date.now();
    //console.log('Generating links...')
    const links = await getGenreLinksFromDB();
    const linksEnd = Date.now();
    //console.log(`Genre links took ${linksEnd - linksStart}ms`);
    return { genres, links };
    // return {
    //     genres: await getAllGenresFromDB(),
    //     links: await getGenreLinksFromDB(),
    // };
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

export async function getTopArtists(genreID: string, amount: number, genreName?: string) {
    const name = genreName ? { name: genreName } : await collections.genres?.findOne({id: genreID}, {projection: {name: 1, _id: 0}});
    if (name) {
        return await collections.artists?.aggregate([
            // Only keep artists that actually have the genre tag
            { $match: { "tags.name": name.name } },

            // Add a field with just the matching tag
            {
                $addFields: {
                    matchingTag: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$tags",
                                    as: "t",
                                    cond: { $eq: ["$$t.name", name.name] }
                                }
                            },
                            0
                        ]
                    }
                }
            },

            { $sort: { "matchingTag.count": -1 } },
            { $limit: amount },
            { $unset: "matchingTag" }
        ]).toArray();
    }
    return [];
}

export async function getArtistDataFiltered(filter: FilterField, amount: number) {
    const artists = await getAllArtistsFiltered(filter, amount);
    return {
        artists,
        count: await collections.artists?.estimatedDocumentCount(),
        links: createArtistLinksLessCPU(artists as unknown as Artist[]),
    }
}

export async function getAllArtistsFiltered(filter: FilterField, amount: number) {
    return await collections.artists?.find({ [filter]: { $type: "number" }}).sort({ [filter]: -1 }).limit(amount).toArray();
}

export async function getMultipleGenresArtistsData(filter: FilterField, amount: number, genreIDs: string[]) {
    const artists = await getMultipleGenresArtists(filter, amount, genreIDs);
    return {
        artists,
        count: await getArtistCountSum(genreIDs),
        links: createArtistLinksLessCPU(artists as unknown as Artist[]),
    }
}

export async function getMultipleGenresArtists(filter: FilterField, amount: number, genreIDs: string[]) {
    return await collections.artists?.find({ genres: {$in: genreIDs}, [filter]: { $type: "number" }}).sort({ [filter]: -1 }).limit(amount).toArray();
}

export async function getArtistCountSum(genreIDs: string[]) {
    const result = await collections.genres?.aggregate([
        {
            $match: { id: { $in: genreIDs } }
        },
        {
            $group: {
                _id: null,
                totalArtistCount: { $sum: "$artistCount" }
            }
        }
    ]).toArray();

    return result && result.length > 0 ? result[0].totalArtistCount : 0;
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

export async function getGenreRoots() {
    return await collections.genres?.find({
        $and: [
            { subgenre_of: { $size: 0 } },
            { fusion_of: { $size: 0 } },
            {
                $or: [
                    { subgenres: { $not: { $size: 0 } } },
                    { fusion_genres: { $not: { $size: 0 } } }
                ]
            }
        ]
    }).toArray();
}

export async function getGenreRootsDoc() {
    return await collections.misc?.findOne({_id: new ObjectId(process.env.ROOTS_DOCUMENT_ID)});
}

export async function getDuplicateArtists() {
    return await collections.artists?.aggregate([  { $match: { id: { $type: "string" } } }, // optional: skip null/missing
        {
            $setWindowFields: {
                partitionBy: "$id",
                output: {
                    duplicateCount: { $count: {} }
                }
            }
        },
        { $match: { duplicateCount: { $gt: 1 } } },
        { $project: { duplicateCount: 0 } }]).toArray();
}

export async function getUserData(id: string) {
    return await collections.users?.findOne({ id: id });
}

export async function getMultipleArtists(artists: string[]){
    const artistData =  await collections.artists?.find({ id: { $in: artists } }).toArray();
    return {
        artists: artistData,
        links: createArtistLinksLessCPU(artistData as unknown as Artist[]),
    }
}

/**
 * Find artists within N degrees (via `similar`) of any of the given seed artist IDs.
 * Returns full artist documents, deduped across all seeds, sorted by degree then name.
 *
 * @param seedIds list of starting artist `id`s (not `_id`)
 * @param degrees maximum degrees of separation (1 = direct similar only)
 * @param limit max number of docs to return
 */
export async function findArtistsWithinDegrees(
    seedIds: string[],
    degrees: number,
    limit: number
) {
    if (!seedIds?.length || degrees < 1 || limit < 1) return [];

    const pipeline = [
        // Start from the seed artists by 'id'
        { $match: { id: { $in: seedIds } } },

        // Traverse the "similar" graph up to `degrees` hops:
        //   startWith = the immediate neighbors' ids
        //   connectFromField = follow each found doc's similar.id
        //   connectToField = match to a doc's id
        {
            $graphLookup: {
                from: "Artists",
                startWith: "$similar.id",
                connectFromField: "similar.id",
                connectToField: "id",
                as: "reached",
                maxDepth: degrees - 1,     // depth 0 => 1 hop; so degrees => degrees-1
                depthField: "degree"       // 0 = one hop away, 1 = two hops away, etc.
            }
        },

        // We only need the reached vertices
        { $project: { reached: 1 } },
        { $unwind: "$reached" },

        // Exclude the seeds (in case of cycles)
        { $match: { "reached.id": { $nin: seedIds } } },

        // When multiple seeds reach the same artist (or via multiple paths),
        // keep a single copy and the minimum degree.
        {
            $group: {
                _id: "$reached.id",
                doc: { $first: "$reached" },
                degree: { $min: "$reached.degree" }
            }
        },

        // Degree 0 means 1 hop away, degree 1 means 2 hops, etc.
        { $sort: { degree: 1, "doc.name": 1 } },
        { $limit: limit },

        // Attach the degree to the document for convenience
        {
            $replaceWith: {
                $mergeObjects: ["$doc", { degree: "$degree" }]
            }
        }
    ];

    const results = await collections.artists?.aggregate<(Artist & { degree: number })>(pipeline).toArray();
    return results;
}
