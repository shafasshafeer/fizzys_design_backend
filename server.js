import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer'; // ✅ ADD THIS IMPORT
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// ✅ Cloudinary Configuration
// ============================================
console.log('☁️ Configuring Cloudinary...');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'yy8file8k',
  api_key: process.env.CLOUDINARY_API_KEY || '256931673873252',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'NPLveGtaK54rCUtE0nRvqk5gpic'
});

// Test Cloudinary connection
const testCloudinary = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connected successfully:', result.status);
    return true;
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error.message);
    console.warn('⚠️ Cloudinary will not work. Please check your credentials.');
    return false;
  }
};

// Run Cloudinary test
await testCloudinary();

// ============================================
// ✅ CORS Configuration
// ============================================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.options('*', cors());

// ============================================
// ✅ Body Parsers
// ============================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// ✅ Serve uploaded files (for fallback)
// ============================================
const uploadsDir = path.join(__dirname, 'uploads');
console.log(`📁 Uploads directory: ${uploadsDir}`);

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

app.use('/uploads', express.static(uploadsDir));

// ============================================
// ✅ Routes
// ============================================
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Fizzys Designs API is running',
    timestamp: new Date().toISOString(),
    cloudinary: 'connected',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fizzys Designs API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      products: '/api/products',
      orders: '/api/orders',
      admin: '/api/admin'
    }
  });
});

// ============================================
// ✅ 404 Handler
// ============================================
app.use((req, res) => {
  console.log('❌ Route not found:', req.method, req.url);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`
  });
});

// ============================================
// ✅ Global Error Handler - FIXED
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Global error handler caught:');
  console.error('   Error:', err.message);
  console.error('   Stack:', err.stack);
  
  // Cloudinary error
  if (err.message && err.message.includes('Cloudinary')) {
    console.error('❌ Cloudinary error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Image upload failed. Please check Cloudinary configuration.',
      error: err.message
    });
  }
  
  // Multer file filter error
  if (err.message && err.message.includes('Only images are allowed')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  // Multer file size error
  if (err.message && err.message.includes('File too large')) {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB.'
    });
  }
  
  // ✅ Multer error - NOW WORKS because multer is imported
  if (err instanceof multer.MulterError) {
    console.error('❌ Multer error:', err.code, err.message);
    return res.status(400).json({
      success: false,
      message: err.message,
      code: err.code
    });
  }
  
  // MongoDB errors
  if (err.name === 'MongoServerError') {
    console.error('❌ MongoDB error:', err.code, err.message);
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate key error. This item already exists.'
      });
    }
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors
    });
  }
  
  // Default error
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Something went wrong on the server',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      name: err.name
    })
  });
});

// ============================================
// ✅ MongoDB Connection
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fizzys_designs';

console.log('🔌 Connecting to MongoDB...');

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully!');
    console.log(`📦 Database: ${mongoose.connection.db.databaseName}`);
    
    app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log('🚀 Fizzys Designs API Server Started');
      console.log('='.repeat(50));
      console.log(`📍 Server running on: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`☁️ Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Configured' : 'Not configured'}`);
      console.log(`📁 Uploads folder: ${uploadsDir}`);
      console.log('='.repeat(50));
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Name:', error.name);
    process.exit(1);
  });

// ============================================
// ✅ Handle unhandled promise rejections
// ============================================
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:');
  console.error('   Error:', err);
  console.error('   Stack:', err.stack);
});

// ============================================
// ✅ Handle uncaught exceptions
// ============================================
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:');
  console.error('   Error:', err);
  console.error('   Stack:', err.stack);
  console.log('🔄 Restarting server...');
  process.exit(1);
});

export default app;