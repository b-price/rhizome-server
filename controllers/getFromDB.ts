import {collections} from "../db/connection";
import {Artist, Genre, ParentField, LinkType, FilterField, BasicItem} from "../types";
import {createArtistLinksLessCPU, createArtistLinksLessMemory} from "../utils/createArtistLinks";
import {ObjectId} from "mongodb";
import {setCodeAccessed} from "./writeToDB";
import throttleQueue from "../utils/throttleQueue";
import {mbLookup} from "./mbLookup";

export async function getAllGenresFromDB() {
    return await collections.genres?.find({}).toArray() as unknown as Genre[];
}

export async function getGenresFromIDs(genreIDs: string[]) {
    return await collections.genres?.find({ id: {$in: genreIDs} }).toArray();
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
    return await collections.artists?.find({ genres: {$in: genreIDs}, [filter]: { $type: "number" }, }).sort({ [filter]: -1 }).limit(amount).toArray();
}

export async function getRelatedGenresArtists(artist: Artist, filter: FilterField, amount: number, useSimilar = true) {
    if (!artist.genres.length) {
        return;
    }
    const genres = await getGenresFromIDs(artist.genres);
    const artists = await getMultipleGenresArtists(filter, amount, artist.genres) as unknown as Artist[];
    if (!artists || !artists.length) {
        return;
    }
    const artistIDs = artists.map(artist => artist.id);
    if (!artistIDs.includes(artist.id)) {
        artists.push(artist);
    }
    if (useSimilar) {
        const similarArtists = await getSimilarArtistsFromArray(artist.similar);
        for (const similarArtist of similarArtists) {
            if (!artistIDs.includes(similarArtist.id) && similarArtist.genres.some(g => artist.genres.includes(g))) {
                artists.push(similarArtist);
            }
        }
    }
    return {
        artists,
        count: await getArtistCountSum(artist.genres),
        links: createArtistLinksLessCPU(artists),
        genres,
    }
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

export async function getArtistFromID(id: string) {
    return await collections.artists?.findOne({ id: id });
}

export async function getSimilarArtistsFromArray(artists: string[]) {
    const similarArtists: Artist[] = [];
    for (const artist of artists) {
        const similarArtist = await getArtistByName(artist);
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

export async function matchArtistNameInDB(query: string, limit = 10) {
    const searchQuery = [{ $search: { text: { query, path: "name" }, index: "name" } }, { $limit: limit }];
    return collections.artists?.aggregate(searchQuery).toArray();
}

export async function getArtistByExactName(name: string) {
    return await collections.artists?.findOne({ name: name });
}

// Gets an artist by exact name; failing that tries to find by search (with name match check)
export async function getArtistByName(name: string) {
    const exactResult = await getArtistByExactName(name) as unknown as Artist;
    if (exactResult && exactResult.name) {
        return exactResult;
    } else {
        const result = await matchArtistNameInDB(name, 5);
        if (result && result.length > 0) {
            for (const artist of result) {
                if (artist.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()) {
                    return artist as unknown as Artist;
                }
            }
        }
    }
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

export async function getDuplicateArtistsNames() {
    return collections.artists?.aggregate([
        { $match: { name: { $type: "string" } } }, // optional: skip null/missing
        {
            $setWindowFields: {
                partitionBy: "$name",
                output: {
                    duplicateCount: { $count: {} }
                }
            }
        },
        { $match: { duplicateCount: { $gt: 1 } } },

        // project ONLY id + name
        {
            $project: {
                _id: 0,     // optional but usually desired
                id: 1,
                name: 1
            }
        }
    ]).toArray();
}

export async function getUserData(id: string) {
    return await collections.users?.findOne({ id: id });
}

export async function getMultipleArtists(artists: string[]){
    const artistData =  await collections.artists?.find({ id: { $in: artists } }).toArray();
    // For testing: delete
    // const fetchedIDs = artistData?.map(a => a.id)
    // for (const artist of artists) {
    //     if (fetchedIDs && !fetchedIDs.includes(artist)) {
    //         console.log(artist + " not found in DB, looking up via musicbrainz...")
    //         const missingData = await throttleQueue.enqueue(() => mbLookup(artist, 'artist'))
    //         if (missingData) {
    //             console.log(missingData)
    //         } else {
    //             console.log('Not found in MB!')
    //         }
    //     }
    // }
    return {
        artists: artistData,
        links: createArtistLinksLessCPU(artistData as unknown as Artist[]),
    }
}

/**
 * Find artists within N hops (via `similar` name graph) of any given seed artist IDs.
 * Returns full artist documents, deduped across all seeds, sorted by hopDistance then name.
 * hopDistance 1 = directly similar, 2 = similar to similar, etc.
 *
 * @param seedIds list of starting artist `id`s
 * @param hops maximum hops (1 = direct similar only, 2 = two hops out, etc.)
 * @param limit max number of docs to return
 * @param genreFilter if provided, only return artists whose genres overlap this list
 */
export async function findArtistsByHops(
    seedIds: string[],
    hops: number,
    limit: number,
    genreFilter?: string[]
) {
    if (!seedIds?.length || hops < 1 || limit < 1) return [];

    const genreMatchStage = genreFilter?.length
        ? [{ $match: { "reached.genres": { $in: genreFilter } } }]
        : [];

    const pipeline = [
        { $match: { id: { $in: seedIds } } },
        {
            $graphLookup: {
                from: "Artists",
                startWith: "$similar",
                connectFromField: "similar",
                connectToField: "name",
                as: "reached",
                maxDepth: hops - 1,
                depthField: "hopDegree"
            }
        },
        { $project: { reached: 1 } },
        { $unwind: "$reached" },
        { $match: { "reached.id": { $nin: seedIds } } },
        ...genreMatchStage,
        {
            $group: {
                _id: "$reached.id",
                doc: { $first: "$reached" },
                hopDegree: { $min: "$reached.hopDegree" }
            }
        },
        { $sort: { hopDegree: 1, "doc.name": 1 } },
        { $limit: limit },
        {
            $replaceWith: {
                $mergeObjects: ["$doc", { hopDistance: { $add: ["$hopDegree", 1] } }]
            }
        }
    ];

    const results = await collections.artists?.aggregate<(Artist & { hopDistance: number })>(pipeline).toArray();
    return results ?? [];
}

function buildDecadeCondition(startYear: number, endYear: number) {
    return {
        $and: [
            { $lte: [{ $toInt: { $substr: ["$startDate", 0, 4] } }, endYear] },
            {
                $or: [
                    { $not: { $gt: [{ $strLenCP: { $ifNull: ["$endDate", ""] } }, 3] } },
                    { $gte: [{ $toInt: { $substr: ["$endDate", 0, 4] } }, startYear] }
                ]
            }
        ]
    };
}

export async function getArtistsByDecades(
    decades: string[],
    filter: FilterField,
    amount: number,
    genreIDs?: string[]
) {
    const decadeConditions = decades.map(d => {
        const startYear = parseInt(d.replace('s', ''));
        return buildDecadeCondition(startYear, startYear + 9);
    });

    const matchStage: Record<string, unknown> = {
        startDate: { $exists: true, $nin: [null, ""] },
        [filter]: { $type: "number" },
        $expr: {
            $and: [
                { $gt: [{ $strLenCP: "$startDate" }, 3] },
                decadeConditions.length === 1 ? decadeConditions[0] : { $or: decadeConditions }
            ]
        }
    };

    if (genreIDs?.length) {
        matchStage.genres = { $in: genreIDs };
    }

    const artists = await collections.artists
        ?.find(matchStage)
        .sort({ [filter]: -1 })
        .limit(amount)
        .toArray();

    const countMatch: Record<string, unknown> = {
        startDate: { $exists: true, $nin: [null, ""] },
        $expr: {
            $and: [
                { $gt: [{ $strLenCP: "$startDate" }, 3] },
                decadeConditions.length === 1 ? decadeConditions[0] : { $or: decadeConditions }
            ]
        }
    };
    if (genreIDs?.length) countMatch.genres = { $in: genreIDs };

    const count = await collections.artists?.countDocuments(countMatch);

    return {
        artists,
        count,
        links: createArtistLinksLessCPU(artists as unknown as Artist[]),
    };
}

export async function verifyAccessCode(code: string, userEmail: string) {
    const accessCode = await collections.accessCodes?.findOne({ userEmail: userEmail.toLowerCase() });
    const isValid = accessCode ? accessCode.code === code || accessCode.accessed : false;
    if (isValid) {
        await setCodeAccessed(code, isValid);
    }
    return isValid;
}

export async function getAccessCodes(phase?: string, version?: string, emails?: string[]) {
    return await collections.accessCodes?.find({ phase, version, userEmail: { $in: emails } }).toArray();
}

export async function removeAccessCodesByPhase(phase: string) {
    const result = await collections.accessCodes?.deleteMany({ phase });
    console.log(result?.deletedCount)
}

export async function removeAccessCodesByVersion(version: string) {
    const result = await collections.accessCodes?.deleteMany({ version });
    console.log(result?.deletedCount)
}

export async function removeAccessCodesByEmail(emails: string[]) {
    const lowerEmails = emails.map(email => email.toLowerCase());
    const result = await collections.accessCodes?.deleteMany({ userEmail: { $in: lowerEmails } });
    console.log(result?.deletedCount)
}
