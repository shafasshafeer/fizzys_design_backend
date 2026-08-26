import express from 'express';
import Product from '../models/Product.js';
import { uploadProductImages } from '../middleware/upload.js';

const router = express.Router();

// GET all products
router.get('/', async (req, res) => {
  try {
    console.log('📦 Fetching all products...');
    const products = await Product.find().sort({ createdAt: -1 });
    console.log('✅ Products fetched:', products.length);
    
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

// GET single product - Simplified
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    console.log('📦 Fetching product:', productId);
    
    const product = await Product.findById(productId);
    
    if (!product) {
      console.log('❌ Product not found');
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    console.log('✅ Product found:', product.name);
    
    // ✅ Send the product directly
    res.json({
      success: true,
      product: product
    });
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// POST - Create product
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
    productData.price = Number(productData.price) || 0;
    productData.stock = Number(productData.stock) || 0;
    productData.isNew = productData.isNew === 'true' || productData.isNew === true;
    productData.isBestseller = productData.isBestseller === 'true' || productData.isBestseller === true;
    
    const product = new Product(productData);
    await product.save();
    
    console.log('✅ Product created:', product._id);
    
    res.status(201).json({
      success: true,
      product: product,
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
router.put('/:id', uploadProductImages, async (req, res) => {
  try {
    const productId = req.params.id;
    console.log('📦 Updating product:', productId);
    
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
    
    // Handle image uploads
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        updateData.image = req.files.image[0].path;
        console.log('✅ New main image:', updateData.image);
      }
      if (req.files.images) {
        const existingImages = existingProduct.images || [];
        const newImages = req.files.images.map(file => file.path);
        updateData.images = [...existingImages, ...newImages].slice(0, 3);
        console.log('✅ Updated images:', updateData.images);
      }
    }
    
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
    
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    console.log('✅ Product updated:', updatedProduct._id);
    
    res.json({
      success: true,
      product: updatedProduct,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating product:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// DELETE product
router.delete('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    console.log('📦 Deleting product:', productId);
    
    const product = await Product.findByIdAndDelete(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    console.log('✅ Product deleted:', product.name);
    
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