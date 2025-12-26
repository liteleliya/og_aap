const { MongoClient } = require('mongodb');
require('dotenv').config();

let db;
let client;

async function connectToDatabase() {
    try {
        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        db = client.db('aap_database');
        console.log('Connected to MongoDB');
        return db;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}

function getDatabase() {
    if (!db) throw new Error('Database not connected');
    return db;
}

module.exports = { connectToDatabase, getDatabase };