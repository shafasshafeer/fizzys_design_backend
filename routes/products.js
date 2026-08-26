import express from 'express';
import Product from '../models/Product.js';
import { uploadProductImages } from '../middleware/upload.js';

const router = express.Router();

// Helper function to get image URL with fallback
const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400&h=500&fit=crop';
  }
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // For local uploads, return as-is (if they exist on server)
  if (imagePath.startsWith('/uploads')) {
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
    
    // ✅ Add fallback images for each product
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
    
    // ✅ Add fallback images
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST create product with images
router.post('/', uploadProductImages, async (req, res) => {
  try {
    const productData = req.body;
    
    if (typeof productData.sizes === 'string') {
      productData.sizes = JSON.parse(productData.sizes);
    }
    
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        productData.image = `/uploads/${req.files.image[0].filename}`;
        console.log('✅ Main image saved:', productData.image);
      }
      if (req.files.images) {
        productData.images = req.files.images.map(file => `/uploads/${file.filename}`);
        console.log('✅ Additional images saved:', productData.images);
      }
    }
    
    productData.price = Number(productData.price);
    productData.stock = Number(productData.stock);
    productData.isNew = productData.isNew === 'true' || productData.isNew === true;
    productData.isBestseller = productData.isBestseller === 'true' || productData.isBestseller === true;
    
    const product = new Product(productData);
    await product.save();
    
    res.status(201).json({
      success: true,
      product,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// PUT update product
router.put('/:id', uploadProductImages, async (req, res) => {
  try {
    const productData = req.body;
    
    if (typeof productData.sizes === 'string') {
      productData.sizes = JSON.parse(productData.sizes);
    }
    
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        productData.image = `/uploads/${req.files.image[0].filename}`;
      }
      if (req.files.images) {
        const existingProduct = await Product.findById(req.params.id);
        const existingImages = existingProduct?.images || [];
        const newImages = req.files.images.map(file => `/uploads/${file.filename}`);
        productData.images = [...existingImages, ...newImages].slice(0, 3);
      }
    }
    
    if (productData.price) productData.price = Number(productData.price);
    if (productData.stock) productData.stock = Number(productData.stock);
    if (productData.isNew) productData.isNew = productData.isNew === 'true' || productData.isNew === true;
    if (productData.isBestseller) productData.isBestseller = productData.isBestseller === 'true' || productData.isBestseller === true;
    
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
    
    res.json({
      success: true,
      product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(400).json({
      success: false,
      message: error.message
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;