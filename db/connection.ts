import * as mongoDB from "mongodb";

export const collections: { genres?: mongoDB.Collection, artists?: mongoDB.Collection } = {};

export async function connectDB() {
    const mongoUri = process.env.MONGODB_CONNECTION_STRING || '';
    const mongoClient = new mongoDB.MongoClient(mongoUri);
    await mongoClient.connect();
    const db = mongoClient.db('RhizomeData');
    const genres = db.collection('Genres');
    const artists = db.collection('Artists');
    collections.genres = genres;
    collections.artists = artists;
}