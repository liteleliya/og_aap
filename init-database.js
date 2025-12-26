const { MongoClient } = require('mongodb');
require('dotenv').config();

async function setupDatabase() {
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db('aap_database');
        
        // 1. ADD ALL SUBJECTS
        const subjects = [
            // Semester 1
            { code: "CHEM F101", name: "Fundamentals of Chemistry", semester: 1 },
            { code: "BITS F103", name: "Introduction to Engineering Design and Prototyping", semester: 1 },
            { code: "BIO F101", name: "Fundamentals of Biology", semester: 1 },
            { code: "MATH F101", name: "Multivariable Calculus", semester: 1 },
            { code: "MATH F113", name: "Probability and Statistics", semester: 1 },
            { code: "PHY F101", name: "Oscillations and Waves", semester: 1 },
            // Semester 2
            { code: "CHEM F101", name: "Fundamentals of Chemistry", semester: 2 },
            { code: "BITS F103", name: "Introduction to Engineering Design and Prototyping", semester: 2 },
            { code: "BIO F101", name: "Fundamentals of Biology", semester: 2 },
            { code: "MATH F102", name: "Linear Algebra", semester: 2 },
            { code: "MATH F113", name: "Probability and Statistics", semester: 2 },
            { code: "PHY F101", name: "Oscillations and Waves", semester: 2 },
            { code: "EEE F111", name: "Electrical Science", semester: 2 },
            { code: "BITS F111", name: "Thermodynamics", semester: 2 }
        ];
        
        await db.collection('subjects').insertMany(subjects);
        console.log('Added 14 subjects');
        
        // 2. CREATE WHATSAPP GROUPS COLLECTION (empty for now)
        await db.createCollection('whatsapp_groups');
        console.log('Created whatsapp_groups collection');
        
        // 3. CREATE REGISTRATIONS COLLECTION (empty for now)
        await db.createCollection('registrations');
        console.log(' Created registrations collection');
        
        console.log('\nDATABASE SETUP COMPLETE!');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

setupDatabase();