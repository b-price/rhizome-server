import * as mongoDB from "mongodb";

export const collections: {
    genres?: mongoDB.Collection,
    artists?: mongoDB.Collection,
    misc?: mongoDB.Collection,
    badDataReports?: mongoDB.Collection,
    feedback?: mongoDB.Collection,
    users?: mongoDB.Collection,
} = {};

export const authDB: { db?: mongoDB.Db } = {};

export async function connectDB() {
    const mongoUri = process.env.MONGODB_CONNECTION_STRING || '';
    const mongoClient = new mongoDB.MongoClient(mongoUri);
    await mongoClient.connect();
    const db = mongoClient.db('RhizomeData');
    const dbAuth = mongoClient.db('RhizomeAuth');
    const genres = db.collection('Genres');
    const artists = db.collection('Artists');
    const misc = db.collection('Misc');
    const badDataReports = db.collection('BadDataReports');
    const feedback = db.collection('Feedback');
    const users = db.collection('Users');
    collections.genres = genres;
    collections.artists = artists;
    collections.misc = misc;
    collections.badDataReports = badDataReports;
    collections.feedback = feedback;
    collections.users = users;
    authDB.db = dbAuth;
}