/**
 * Script to drop all custom indexes from MongoDB collections
 * Run: node scripts/dropIndexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function dropAllIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get all collection names
    const collections = await db.listCollections().toArray();

    console.log('\n========================================');
    console.log('Dropping indexes from all collections...');
    console.log('========================================\n');

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);

      // Get current indexes
      const indexes = await collection.indexes();

      console.log(`\n📁 Collection: ${collectionName}`);
      console.log(`   Current indexes: ${indexes.length}`);

      // Drop all indexes except _id
      for (const index of indexes) {
        if (index.name !== '_id_') {
          try {
            await collection.dropIndex(index.name);
            console.log(`   ✅ Dropped index: ${index.name}`);
          } catch (err) {
            console.log(`   ❌ Failed to drop ${index.name}: ${err.message}`);
          }
        }
      }
    }

    console.log('\n========================================');
    console.log('✅ All custom indexes dropped successfully!');
    console.log('========================================\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
}

dropAllIndexes();
