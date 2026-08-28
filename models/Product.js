import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: ''
  },
  sizes: [{
    type: String,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL']
  }],
  
  // ✅ NEW: Size-specific stock
  sizeStock: {
    type: Map,
    of: Number,
    default: new Map()
  },
  
  image: {
    type: String,
    default: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400&h=500&fit=crop'
  },
  images: [{
    type: String
  }],
  isNew: {
    type: Boolean,
    default: false
  },
  isBestseller: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: [
      'ethnic', 'western', 'fusion', 'festive',
      '2-Piece Cord Sets', 
      '3-Piece Readymade Sets', 
      '3-Piece Unstitched Sets', 
      'Short Kurtis', 
      'Sarees', 
      'Nightwear', 
      'Bottom Wear', 
      'Crop Tops'
    ],
    default: 'ethnic'
  },
  
  // ⚠️ DEPRECATED: Kept for backward compatibility
  // Use sizeStock instead
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 4.5
  },
  reviews: [{
    user: String,
    rating: Number,
    comment: String,
    date: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ HELPER: Get stock for a specific size
productSchema.methods.getSizeStock = function(size) {
  if (this.sizeStock && this.sizeStock instanceof Map) {
    return this.sizeStock.get(size) || 0;
  }
  // Fallback for plain object
  if (this.sizeStock && typeof this.sizeStock === 'object') {
    return this.sizeStock[size] || 0;
  }
  return 0;
};

// ✅ HELPER: Check if a specific size is in stock
productSchema.methods.isSizeInStock = function(size, quantity = 1) {
  const available = this.getSizeStock(size);
  return available >= quantity;
};

// ✅ HELPER: Reduce stock for a specific size
productSchema.methods.reduceSizeStock = function(size, quantity = 1) {
  const currentStock = this.getSizeStock(size);
  const remaining = Math.max(0, currentStock - quantity);
  
  if (this.sizeStock instanceof Map) {
    this.sizeStock.set(size, remaining);
  } else if (typeof this.sizeStock === 'object') {
    this.sizeStock[size] = remaining;
  }
  
  // Update total stock
  this.stock = this.calculateTotalStock();
  return this;
};

// ✅ HELPER: Calculate total stock across all sizes
productSchema.methods.calculateTotalStock = function() {
  let total = 0;
  
  if (this.sizeStock instanceof Map) {
    for (const count of this.sizeStock.values()) {
      total += count || 0;
    }
  } else if (typeof this.sizeStock === 'object') {
    for (const key in this.sizeStock) {
      total += this.sizeStock[key] || 0;
    }
  }
  
  return total;
};

// ✅ VIRTUAL: Total stock across all sizes
productSchema.virtual('totalStock').get(function() {
  return this.calculateTotalStock();
});

// ✅ VIRTUAL: Check if product has any stock
productSchema.virtual('inStock').get(function() {
  return this.calculateTotalStock() > 0;
});

// ✅ VIRTUAL: Get stock status
productSchema.virtual('stockStatus').get(function() {
  const total = this.calculateTotalStock();
  if (total > 10) return 'In Stock';
  if (total > 0) return 'Low Stock';
  return 'Out of Stock';
});

// ✅ VIRTUAL: Get stock summary for display
productSchema.virtual('stockSummary').get(function() {
  const summary = {};
  if (this.sizes && this.sizes.length > 0) {
    this.sizes.forEach(size => {
      summary[size] = this.getSizeStock(size);
    });
  }
  return summary;
});

// ✅ VIRTUAL: Check if any size is in stock
productSchema.virtual('hasAnyStock').get(function() {
  if (this.sizes && this.sizes.length > 0) {
    for (const size of this.sizes) {
      if (this.getSizeStock(size) > 0) return true;
    }
    return false;
  }
  return this.calculateTotalStock() > 0;
});

// ✅ Text index for search
productSchema.index({ name: 'text', description: 'text' });

// ✅ Index for faster queries
productSchema.index({ category: 1 });
productSchema.index({ isNew: 1 });
productSchema.index({ isBestseller: 1 });
productSchema.index({ createdAt: -1 });

// ✅ Pre-save middleware: Auto-calculate total stock
productSchema.pre('save', function(next) {
  // If sizeStock exists and is not empty, calculate total
  if (this.sizeStock && (this.sizeStock.size > 0 || Object.keys(this.sizeStock).length > 0)) {
    this.stock = this.calculateTotalStock();
  }
  next();
});

// ✅ Pre-update middleware for findOneAndUpdate
productSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.$set && update.$set.sizeStock) {
    // Calculate total stock if sizeStock is being updated
    const stockMap = update.$set.sizeStock;
    let total = 0;
    if (stockMap instanceof Map) {
      for (const count of stockMap.values()) {
        total += count || 0;
      }
    } else if (typeof stockMap === 'object') {
      for (const key in stockMap) {
        total += stockMap[key] || 0;
      }
    }
    update.$set.stock = total;
  }
  next();
});

const Product = mongoose.model('Product', productSchema);

export default Product;