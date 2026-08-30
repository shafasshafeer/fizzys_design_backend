import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

console.log('☁️ Configuring Cloudinary upload middleware...');

// ✅ FIXED: Use correct cloud name (yy8fle8k not yy8file8k)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'yy8fle8k',
  api_key: process.env.CLOUDINARY_API_KEY || '256931673873252',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'NPLveGtaK54rCUtE0nRvqk5gpic'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'fizzys-products',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
    transformation: [
      { width: 400, height: 500, crop: 'limit' },
      { quality: 'auto:low' },
      { fetch_format: 'webp' }  // ✅ NEW: Convert all uploads to WebP
    ]
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

export const uploadProductImages = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

console.log('✅ Cloudinary upload middleware configured');
console.log('📸 Image optimization: 400x500, WebP format, auto:low quality');

export default upload;