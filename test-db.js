import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  try {
    console.log('🔄 Testing MongoDB connection...');
    console.log(`📦 Using URI: ${process.env.MONGODB_URI}`);
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected successfully!');
    console.log(`📦 Database: ${mongoose.connection.db.databaseName}`);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📋 Collections: ${collections.map(c => c.name).join(', ') || 'No collections yet'}`);
    
    await mongoose.connection.close();
    console.log('👋 Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
};

testConnection();