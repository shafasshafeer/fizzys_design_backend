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
  stock: {
    type: Number,
    default: 10,
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
  timestamps: true
});

// Virtual to check if product is in stock
productSchema.virtual('inStock').get(function() {
  return this.stock > 0;
});

// Virtual to get stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock > 10) return 'In Stock';
  if (this.stock > 0) return 'Low Stock';
  return 'Out of Stock';
});

productSchema.index({ name: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);

export default Product;