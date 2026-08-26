import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// ✅ COMPLETE CORS CONFIGURATION
// ============================================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
  'https://fizzys-design-fronted.vercel.app',
  'https://fizzys-design-frontend.vercel.app',
  'https://fizzys-design-fronted-git-main-shafasshafeers-projects.vercel.app',
  'https://fizzys-design-backend.onrender.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(null, true); // Allow all for now (temporary fix)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Requested-With']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// ✅ ROUTES
// ============================================
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// ============================================
// ✅ HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Fizzys Designs API is running',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// ============================================
// ✅ TEST CORS ROUTE
// ============================================
app.get('/api/test-cors', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin || 'No origin'
  });
});

// ============================================
// ✅ ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// ✅ 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ============================================
// ✅ MONGODB CONNECTION
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fizzys_designs';

console.log('🔌 Connecting to MongoDB...');

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully!');
    console.log(`📦 Database: ${mongoose.connection.db.databaseName}`);
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 CORS allowed origins:`);
      allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Check MongoDB Atlas IP whitelist');
    console.log('   2. Verify MongoDB URI is correct');
    console.log('   3. Check network connectivity');
    process.exit(1);
  });

// ============================================
// ✅ GRACEFUL SHUTDOWN
// ============================================
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('\n👋 MongoDB connection closed');
  process.exit(0);
});