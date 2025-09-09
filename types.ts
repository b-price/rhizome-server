export interface BasicItem {
    id: string;
    name: string;
}

export interface GenresJSON {
    count: number;
    genres: Genre[];
    links: NodeLink[];
    date: string;
}

export interface Tag {
    name: string;
    count: number;
}

export interface Artist extends BasicItem {
    tags: Tag[];
    genres: string[];
    listeners: number;
    playcount: number;
    similar: string[];
    bio: LastFMBio;
    noMBID: boolean;
    location?: string;
    startDate?: string;
    endDate?: string;
    image?: string;
    badDataFlag?: boolean;
    badDataReason?: string;
}

export interface ArtistData extends BasicItem {
    score: number;
    tags: Tag[];
    area: { name: string };
    "life-span": { begin: string, end: string };
    relations: { type: string, url: { resource: string } }[];
}

export interface ArtistResponse {
    count: number;
    artists: ArtistData[];
}

export interface ArtistJSON {
    count: number;
    artists: Artist[];
    links: NodeLink[];
    date: string;
    genre: string;
}

export interface GenreArtistCountsJSON {
    genreMap: { [k: string]: number; };
    date: string;
}

export interface NodeLink {
    source: string;
    target: string;
    linkType?: LinkType;
}

export interface LastFMArtistJSON extends BasicItem {
    ontour: boolean;
    stats: LastFMStats;
    bio: LastFMBio;
    similar: string[];
    date: string;
}

export interface LastFMStats {
    listeners: number;
    playcount: number;
}

export interface LastFMBio {
    link: string;
    summary: string;
    content: string;
}

export interface MBGenre {
    id: string;
    name: string;
}

export interface Genre extends SimpleGenre {
    subgenre_of: MBGenre[];
    influenced_genres: MBGenre[];
    subgenres: MBGenre[];
    fusion_genres: MBGenre[];
    fusion_of: MBGenre[];
    influenced_by: MBGenre[];
    description?: string;
    descriptionAI?: boolean;
    totalListeners?: number;
    totalPlays?: number;
    from?: string[];
    named_after_area?: string[];
    used_instruments?: string[];
    badDataFlag?: boolean;
    badDataReason?: string;
}

export type CacheValidity = 'valid' | 'stale' | 'notFound' | 'error';

export interface CacheResponse {
    valid: CacheValidity,
    data: ArtistJSON | GenresJSON | LastFMArtistJSON | MBGenre[] | null;
}

export interface SimpleGenre extends BasicItem {
    artistCount: number;
}

export interface LastFMSearchArtistData extends BasicItem {
    listeners: number;
}

export type LinkType = 'subgenre' | 'influence' | 'fusion' | 'similar';

export type ParentField = 'subgenre_of' | 'influenced_by' | 'fusion_of';

export type FilterField = 'listeners' | 'playcount';

export interface GenreResponse {
    'genre-count': number;
    genres: MBGenre[];
}

export interface BadDataReport {
    userID: string;
    itemType: 'genre' | 'artist';
    itemID: string;
    field: keyof Artist | keyof Genre;
}