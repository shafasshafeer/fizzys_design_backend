import express from 'express';
import Product from '../models/Product.js';
import { uploadProductImages } from '../middleware/upload.js';

const router = express.Router();

// Helper function for fallback images
const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400&h=500&fit=crop';
  }
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400&h=500&fit=crop';
};

// GET all products
router.get('/', async (req, res) => {
  try {
    console.log('📦 Fetching all products...');
    const products = await Product.find().sort({ createdAt: -1 });
    
    const productsWithImages = products.map(product => ({
      ...product.toObject(),
      image: getImageUrl(product.image),
      images: product.images ? product.images.map(img => getImageUrl(img)) : []
    }));
    
    res.json({
      success: true,
      products: productsWithImages
    });
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// GET single product
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
      product: {
        ...product.toObject(),
        image: getImageUrl(product.image),
        images: product.images ? product.images.map(img => getImageUrl(img)) : []
      }
    });
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST - Create product
router.post('/', uploadProductImages, async (req, res) => {
  try {
    console.log('📦 Creating product...');
    console.log('Body:', req.body);
    console.log('Files:', req.files);
    
    const productData = req.body;
    
    // Parse sizes
    if (typeof productData.sizes === 'string') {
      try {
        productData.sizes = JSON.parse(productData.sizes);
      } catch (e) {
        productData.sizes = [];
      }
    }
    
    // Get Cloudinary URLs
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        productData.image = req.files.image[0].path;
        console.log('✅ Main image:', productData.image);
      }
      if (req.files.images) {
        productData.images = req.files.images.map(file => file.path);
        console.log('✅ Additional images:', productData.images);
      }
    }
    
    // Parse numbers
    productData.price = Number(productData.price) || 0;
    productData.stock = Number(productData.stock) || 0;
    productData.isNew = productData.isNew === 'true' || productData.isNew === true;
    productData.isBestseller = productData.isBestseller === 'true' || productData.isBestseller === true;
    
    const product = new Product(productData);
    await product.save();
    
    console.log('✅ Product created:', product._id);
    
    res.status(201).json({
      success: true,
      product: {
        ...product.toObject(),
        image: getImageUrl(product.image),
        images: product.images ? product.images.map(img => getImageUrl(img)) : []
      },
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating product:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// PUT - Update product
// PUT - Update product (with better error handling)
router.put('/:id', uploadProductImages, async (req, res) => {
  try {
    console.log('📦 Updating product:', req.params.id);
    console.log('Received body:', JSON.stringify(req.body, null, 2));
    
    const productData = req.body;
    
    // ✅ Clean the data - remove undefined/null values
    const cleanData = {};
    
    // Only include fields that are actually provided
    if (productData.name) cleanData.name = productData.name;
    if (productData.price) cleanData.price = Number(productData.price);
    if (productData.description) cleanData.description = productData.description;
    if (productData.category) cleanData.category = productData.category;
    if (productData.stock !== undefined) cleanData.stock = Number(productData.stock);
    if (productData.isNew !== undefined) cleanData.isNew = productData.isNew === 'true' || productData.isNew === true;
    if (productData.isBestseller !== undefined) cleanData.isBestseller = productData.isBestseller === 'true' || productData.isBestseller === true;
    
    // Handle sizes
    if (productData.sizes) {
      if (typeof productData.sizes === 'string') {
        try {
          cleanData.sizes = JSON.parse(productData.sizes);
        } catch (e) {
          cleanData.sizes = [];
        }
      } else if (Array.isArray(productData.sizes)) {
        cleanData.sizes = productData.sizes;
      }
    }
    
    // Handle image uploads
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        cleanData.image = req.files.image[0].path;
        console.log('✅ New main image:', cleanData.image);
      }
      if (req.files.images) {
        const existingProduct = await Product.findById(req.params.id);
        const existingImages = existingProduct?.images || [];
        const newImages = req.files.images.map(file => file.path);
        cleanData.images = [...existingImages, ...newImages].slice(0, 3);
        console.log('✅ Updated images:', cleanData.images);
      }
    }
    
    console.log('Clean data to update:', JSON.stringify(cleanData, null, 2));
    
    // Update the product
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: cleanData },
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    console.log('✅ Product updated:', product._id);
    
    res.json({
      success: true,
      product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating product:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// DELETE product
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