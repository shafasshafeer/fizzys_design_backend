import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import Admin from './models/Admin.js';

dotenv.config();

const sampleProducts = [
  {
    name: 'Noor Anarkali',
    price: 2899,
    description: 'Elegant Anarkali dress with intricate embroidery and premium fabric. Perfect for weddings and festive occasions.',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400&h=500&fit=crop',
    isNew: true,
    category: 'ethnic',
    stock: 15,
    rating: 4.8
  },
  {
    name: 'Zara A-Line Dress',
    price: 2599,
    description: 'Beautiful A-Line dress with modern design. Perfect for parties and casual outings.',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    image: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400&h=500&fit=crop',
    isNew: true,
    category: 'western',
    stock: 20,
    rating: 4.6
  },
  {
    name: 'Mira Festive Dress',
    price: 2999,
    description: 'Stunning festive dress with modern design and traditional touch. Ideal for celebrations.',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=500&fit=crop',
    isBestseller: true,
    category: 'festive',
    stock: 12,
    rating: 4.9
  },
  {
    name: 'Aisha Maxi Dress',
    price: 2799,
    description: 'Elegant maxi dress with flowing fabric. Perfect for special occasions and evening events.',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    image: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400&h=500&fit=crop',
    isNew: true,
    category: 'western',
    stock: 18,
    rating: 4.7
  },
  {
    name: 'Meera Lehenga',
    price: 4999,
    description: 'Traditional lehenga with beautiful embroidery and rich fabric. Perfect for weddings.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&h=500&fit=crop',
    isBestseller: true,
    category: 'ethnic',
    stock: 8,
    rating: 4.9
  },
  {
    name: 'Sana Kurti Set',
    price: 1999,
    description: 'Comfortable and stylish kurti set for daily wear. Made with premium cotton fabric.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    image: 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&h=500&fit=crop',
    category: 'ethnic',
    stock: 25,
    rating: 4.4
  },
  {
    name: 'Isha Party Gown',
    price: 3499,
    description: 'Stunning party gown with elegant design. Perfect for cocktail parties and events.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400&h=500&fit=crop',
    isNew: true,
    category: 'western',
    stock: 10,
    rating: 4.8
  },
  {
    name: 'Riya Fusion Dress',
    price: 2399,
    description: 'Modern fusion dress combining traditional and contemporary styles.',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    image: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400&h=500&fit=crop',
    isNew: true,
    category: 'fusion',
    stock: 15,
    rating: 4.5
  }
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    // Clear existing data
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing products');

    // Insert sample products
    await Product.insertMany(sampleProducts);
    console.log('✅ Seeded', sampleProducts.length, 'products');

    // Create admin if not exists
    const adminExists = await Admin.findOne({ email: 'admin@fizzys.com' });
    if (!adminExists) {
      const admin = new Admin({
        username: 'admin',
        email: 'admin@fizzys.com',
        password: 'admin123',
        name: 'Fizzys Admin'
      });
      await admin.save();
      console.log('✅ Admin created: admin@fizzys.com / admin123');
    } else {
      console.log('✅ Admin already exists');
    }

    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase(); 