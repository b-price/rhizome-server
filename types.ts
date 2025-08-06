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
    location?: string;
    startDate?: string;
    endDate?: string;
    image?: string;
}

interface ArtistData extends BasicItem {
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
    linkType?: GenreClusterMode;
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
    from?: string[];
    named_after_area?: string[];
    used_instruments?: string[];
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

export type GenreClusterMode = 'subgenre' | 'influence' | 'fusion';