import express from 'express';
import Product from '../models/Product.js';
import { uploadProductImages } from '../middleware/upload.js';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();

// ============================================
// GET all products
// ============================================
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      products: products
    });
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ============================================
// GET single product
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    res.json({
      success: true,
      product: product
    });
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// POST - Create product with Cloudinary
// ============================================
router.post('/', uploadProductImages, async (req, res) => {
  try {
    console.log('📦 Creating product...');
    console.log('📋 Request body:', req.body);
    console.log('📁 Files received:', req.files ? 'Yes' : 'No');
    
    if (req.files) {
      if (req.files.image) {
        console.log('📸 Main image file:', req.files.image[0].originalname);
        console.log('📸 Main image path:', req.files.image[0].path);
      }
      if (req.files.images) {
        console.log('📸 Additional images:', req.files.images.length);
        req.files.images.forEach((file, i) => {
          console.log(`   ${i + 1}. ${file.originalname} -> ${file.path}`);
        });
      }
    }
    
    const productData = req.body;
    
    // Parse sizes
    if (typeof productData.sizes === 'string') {
      try {
        productData.sizes = JSON.parse(productData.sizes);
      } catch (e) {
        console.log('⚠️ Failed to parse sizes, using empty array');
        productData.sizes = [];
      }
    }
    
    // ✅ NEW: Parse sizeStock
    if (productData.sizeStock) {
      try {
        const stockData = typeof productData.sizeStock === 'string' 
          ? JSON.parse(productData.sizeStock) 
          : productData.sizeStock;
        
        // Convert to Map for storage
        const stockMap = new Map();
        let totalStock = 0;
        
        for (const [size, count] of Object.entries(stockData)) {
          const numCount = parseInt(count) || 0;
          stockMap.set(size, numCount);
          totalStock += numCount;
        }
        
        productData.sizeStock = stockMap;
        productData.stock = totalStock; // Auto-calculate total
        console.log('✅ Size stock:', Object.fromEntries(stockMap));
        console.log('✅ Total stock:', totalStock);
      } catch (e) {
        console.log('⚠️ Failed to parse sizeStock:', e.message);
        productData.sizeStock = new Map();
      }
    } else if (productData.sizes && productData.sizes.length > 0) {
      // Initialize sizeStock with 0 for all sizes if not provided
      const stockMap = new Map();
      productData.sizes.forEach(size => {
        stockMap.set(size, 0);
      });
      productData.sizeStock = stockMap;
      productData.stock = 0;
    }
    
    // Handle images - use Cloudinary URLs or fallback
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        productData.image = req.files.image[0].path;
        console.log('✅ Main image saved:', productData.image);
      }
      if (req.files.images) {
        productData.images = req.files.images.map(file => file.path);
        console.log('✅ Additional images saved:', productData.images);
      }
    } else {
      productData.image = 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400&h=500&fit=crop';
      console.log('⚠️ No image uploaded, using fallback');
    }
    
    // Parse numbers and booleans
    productData.price = Number(productData.price) || 0;
    productData.isNew = productData.isNew === 'true' || productData.isNew === true;
    productData.isBestseller = productData.isBestseller === 'true' || productData.isBestseller === true;
    
    // Create product
    const product = new Product(productData);
    await product.save();
    
    console.log('✅ Product created successfully:', product._id);
    
    res.status(201).json({
      success: true,
      product: product,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating product:');
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    
    if (error.message && error.message.includes('Cloudinary')) {
      return res.status(500).json({
        success: false,
        message: 'Image upload to Cloudinary failed. Please check your Cloudinary configuration.',
        error: error.message
      });
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate entry. This product already exists.'
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// ============================================
// PUT - Update product with Cloudinary
// ============================================
router.put('/:id', uploadProductImages, async (req, res) => {
  try {
    const productId = req.params.id;
    console.log('📦 Updating product:', productId);
    console.log('📋 Request body:', req.body);
    console.log('📁 Files received:', req.files ? 'Yes' : 'No');
    
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const productData = req.body;
    const updateData = {};
    
    // Update fields
    if (productData.name !== undefined) updateData.name = productData.name;
    if (productData.description !== undefined) updateData.description = productData.description;
    if (productData.category !== undefined) updateData.category = productData.category;
    if (productData.price !== undefined) updateData.price = Number(productData.price);
    
    if (productData.isNew !== undefined) {
      updateData.isNew = productData.isNew === 'true' || productData.isNew === true;
    }
    if (productData.isBestseller !== undefined) {
      updateData.isBestseller = productData.isBestseller === 'true' || productData.isBestseller === true;
    }
    
    if (productData.sizes !== undefined) {
      if (typeof productData.sizes === 'string') {
        try {
          updateData.sizes = JSON.parse(productData.sizes);
        } catch (e) {
          updateData.sizes = [];
        }
      } else if (Array.isArray(productData.sizes)) {
        updateData.sizes = productData.sizes;
      }
    }
    
    // ✅ NEW: Handle sizeStock update
    if (productData.sizeStock) {
      try {
        const stockData = typeof productData.sizeStock === 'string' 
          ? JSON.parse(productData.sizeStock) 
          : productData.sizeStock;
        
        // Convert to Map
        const stockMap = new Map();
        let totalStock = 0;
        
        for (const [size, count] of Object.entries(stockData)) {
          const numCount = parseInt(count) || 0;
          stockMap.set(size, numCount);
          totalStock += numCount;
        }
        
        updateData.sizeStock = stockMap;
        updateData.stock = totalStock;
        console.log('✅ Updated size stock:', Object.fromEntries(stockMap));
        console.log('✅ Updated total stock:', totalStock);
      } catch (e) {
        console.log('⚠️ Failed to parse sizeStock:', e.message);
      }
    }
    
    // Handle images - only update if new files are uploaded
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        updateData.image = req.files.image[0].path;
        console.log('✅ New main image saved:', updateData.image);
      }
      if (req.files.images) {
        const existingImages = existingProduct.images || [];
        const newImages = req.files.images.map(file => file.path);
        updateData.images = [...existingImages, ...newImages].slice(0, 3);
        console.log('✅ Updated additional images:', updateData.images);
      }
    } else {
      console.log('ℹ️ No new images uploaded, keeping existing');
    }
    
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    console.log('✅ Product updated successfully:', updatedProduct._id);
    
    res.json({
      success: true,
      product: updatedProduct,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating product:');
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// ============================================
// DELETE product
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;