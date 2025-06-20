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
}

interface ArtistData {
    id: string;
    name: string;
    score: number;
    tags: Tag[];
    area: { name: string };
    "life-span": { begin: string, end: string };
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