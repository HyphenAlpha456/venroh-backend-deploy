import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const clearCollectionData = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('Error: MONGO_URI is missing from .env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas.');

    const collections = await mongoose.connection.db.collections();

    for (let collection of collections) {
      await collection.deleteMany({});
      console.log(`Cleared all data from collection: ${collection.collectionName}`);
    }

    console.log('All collections are now empty. Database structure preserved.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error clearing data:', error);
    process.exit(1);
  }
};

clearCollectionData();