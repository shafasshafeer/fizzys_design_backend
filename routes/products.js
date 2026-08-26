import express from 'express';
import Product from '../models/Product.js';
import { uploadProductImages } from '../middleware/upload.js';

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
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ============================================
// GET single product by ID
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
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// POST - Create new product
// ============================================
router.post('/', uploadProductImages, async (req, res) => {
  try {
    const productData = req.body;
    
    // Parse sizes if sent as string
    if (typeof productData.sizes === 'string') {
      try {
        productData.sizes = JSON.parse(productData.sizes);
      } catch (e) {
        productData.sizes = [];
      }
    }
    
    // Get Cloudinary URLs if images uploaded
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        productData.image = req.files.image[0].path;
      }
      if (req.files.images) {
        productData.images = req.files.images.map(file => file.path);
      }
    }
    
    // Parse numbers
    productData.price = Number(productData.price) || 0;
    productData.stock = Number(productData.stock) || 0;
    productData.isNew = productData.isNew === 'true' || productData.isNew === true;
    productData.isBestseller = productData.isBestseller === 'true' || productData.isBestseller === true;
    
    const product = new Product(productData);
    await product.save();
    
    res.status(201).json({
      success: true,
      product: product,
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

// ============================================
// PUT - Update product
// ============================================
router.put('/:id', uploadProductImages, async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Check if product exists
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const productData = req.body;
    const updateData = {};
    
    // String fields
    if (productData.name !== undefined) updateData.name = productData.name;
    if (productData.description !== undefined) updateData.description = productData.description;
    if (productData.category !== undefined) updateData.category = productData.category;
    
    // Number fields
    if (productData.price !== undefined) updateData.price = Number(productData.price);
    if (productData.stock !== undefined) updateData.stock = Number(productData.stock);
    
    // Boolean fields
    if (productData.isNew !== undefined) {
      updateData.isNew = productData.isNew === 'true' || productData.isNew === true;
    }
    if (productData.isBestseller !== undefined) {
      updateData.isBestseller = productData.isBestseller === 'true' || productData.isBestseller === true;
    }
    
    // Sizes
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
    
    // Handle image uploads
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        updateData.image = req.files.image[0].path;
      }
      if (req.files.images) {
        const existingImages = existingProduct.images || [];
        const newImages = req.files.images.map(file => file.path);
        updateData.images = [...existingImages, ...newImages].slice(0, 3);
      }
    }
    
    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      product: updatedProduct,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: error.message
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
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// GET products by category
// ============================================
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ category: category });
    res.json({
      success: true,
      products: products
    });
  } catch (error) {
    console.error('Error fetching by category:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// GET new arrivals
// ============================================
router.get('/new-arrivals', async (req, res) => {
  try {
    const products = await Product.find({ isNew: true })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({
      success: true,
      products: products
    });
  } catch (error) {
    console.error('Error fetching new arrivals:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// GET bestsellers
// ============================================
router.get('/bestsellers', async (req, res) => {
  try {
    const products = await Product.find({ isBestseller: true })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({
      success: true,
      products: products
    });
  } catch (error) {
    console.error('Error fetching bestsellers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;