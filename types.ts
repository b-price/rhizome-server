export interface Genre {
    id: string;
    name: string;
    artistCount: number;
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

export interface Artist {
    id: string;
    name: string;
    tags: Tag[];
    location?: string;
    startDate?: string;
    endDate?: string;
    image?: string;
}

interface ArtistData {
    id: string;
    name: string;
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
}

export interface LastFMArtistJSON {
    name: string;
    mbid: string;
    image: LastFMImage[];
    ontour: boolean;
    stats: LastFMStats;
    bio: LastFMBio;
    similar: string[];
    date: string;
}

export interface LastFMImage {
    link: string;
    size: string;
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