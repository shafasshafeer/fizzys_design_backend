import express from 'express';
import Product from '../models/Product.js';
import { uploadProductImages } from '../middleware/upload.js';

const router = express.Router();

// GET all products
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
    
    // Handle file uploads
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        productData.image = `/uploads/${req.files.image[0].filename}`;
        console.log('✅ Main image:', productData.image);
      }
      if (req.files.images) {
        productData.images = req.files.images.map(file => `/uploads/${file.filename}`);
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
    
    if (productData.name !== undefined) updateData.name = productData.name;
    if (productData.description !== undefined) updateData.description = productData.description;
    if (productData.category !== undefined) updateData.category = productData.category;
    if (productData.price !== undefined) updateData.price = Number(productData.price);
    if (productData.stock !== undefined) updateData.stock = Number(productData.stock);
    
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
    
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        updateData.image = `/uploads/${req.files.image[0].filename}`;
        console.log('✅ New main image:', updateData.image);
      }
      if (req.files.images) {
        const existingImages = existingProduct.images || [];
        const newImages = req.files.images.map(file => `/uploads/${file.filename}`);
        updateData.images = [...existingImages, ...newImages].slice(0, 3);
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
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;