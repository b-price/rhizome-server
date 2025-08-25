import {Genre} from "../types";

export function getSingletons(genres: Genre[]) {
    return genres.filter((genre) => {
        return genre.subgenres.length === 0 &&
            genre.subgenre_of.length === 0 &&
            genre.influenced_genres.length === 0 &&
            genre.influenced_by.length === 0 &&
            genre.fusion_genres.length === 0 &&
            genre.fusion_of.length === 0;
    });
}