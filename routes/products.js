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
    const { limit = 20, page = 1, sort = '-createdAt', category, isNew, isBestseller } = req.query;
    
    const filter = {};
    if (category) filter.category = category;
    if (isNew === 'true') filter.isNew = true;
    if (isBestseller === 'true') filter.isBestseller = true;
    
    const products = await Product.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const productsWithImages = products.map(product => ({
      ...product.toObject(),
      image: getImageUrl(product.image),
      images: product.images ? product.images.map(img => getImageUrl(img)) : []
    }));
    
    const total = await Product.countDocuments(filter);
    
    res.json({
      success: true,
      products: productsWithImages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('GET products error:', error);
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
    
    const productWithImages = {
      ...product.toObject(),
      image: getImageUrl(product.image),
      images: product.images ? product.images.map(img => getImageUrl(img)) : []
    };
    
    res.json({
      success: true,
      product: productWithImages
    });
  } catch (error) {
    console.error('GET product error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST - Create product with Cloudinary
router.post('/', uploadProductImages, async (req, res) => {
  try {
    console.log('📦 Creating product...');
    
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
    productData.price = Number(productData.price);
    productData.stock = Number(productData.stock);
    productData.isNew = productData.isNew === 'true' || productData.isNew === true;
    productData.isBestseller = productData.isBestseller === 'true' || productData.isBestseller === true;
    
    const product = new Product(productData);
    await product.save();
    
    console.log('✅ Product created:', product._id);
    
    res.status(201).json({
      success: true,
      product,
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

// PUT - Update product with Cloudinary
router.put('/:id', uploadProductImages, async (req, res) => {
  try {
    console.log('📦 Updating product:', req.params.id);
    
    const productData = req.body;
    
    // Parse sizes if sent as string
    if (typeof productData.sizes === 'string') {
      try {
        productData.sizes = JSON.parse(productData.sizes);
      } catch (e) {
        productData.sizes = [];
      }
    }
    
    // Handle Cloudinary image uploads
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        productData.image = req.files.image[0].path;
        console.log('✅ New main image:', productData.image);
      }
      if (req.files.images) {
        const existingProduct = await Product.findById(req.params.id);
        const existingImages = existingProduct?.images || [];
        const newImages = req.files.images.map(file => file.path);
        productData.images = [...existingImages, ...newImages].slice(0, 3);
        console.log('✅ Updated images:', productData.images);
      }
    }
    
    // Parse numbers safely
    if (productData.price) productData.price = Number(productData.price);
    if (productData.stock) productData.stock = Number(productData.stock);
    productData.isNew = productData.isNew === 'true' || productData.isNew === true;
    productData.isBestseller = productData.isBestseller === 'true' || productData.isBestseller === true;
    
    // Remove fields that shouldn't be updated
    delete productData._id;
    delete productData.createdAt;
    delete productData.__v;
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
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