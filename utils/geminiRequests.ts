import { GoogleGenAI } from "@google/genai";
import path from "path";

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const apikey = 'AIzaSyCbik2shQ264UzzMx88C1T9AY5vzH4GV1I';
const ai = new GoogleGenAI({apiKey: apikey});

export async function getAIGenreDesc(genre: string) {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Give a brief summary of the musical genre ${genre} using no more than 4 sentences.`,
    });
    return response.text;
   // return 'ai desc'
}

async function main() {
    const genre = 'thrash metal';
    const response = await getAIGenreDesc(genre);
    console.log(response);
}

//main().catch((err) => {console.log(err)});
