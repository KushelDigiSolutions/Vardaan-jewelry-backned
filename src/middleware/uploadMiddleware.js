import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer Memory Storage - stores files in memory
const storage = multer.memoryStorage();

// File filter (Only allow image types)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Custom middleware to upload to Cloudinary
const uploadToCloudinary = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    // Upload each file to Cloudinary
    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'ecom-uploads',
            resource_type: 'auto',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            transformation: [
              { width: 800, height: 800, crop: 'limit', quality: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        // Convert buffer to stream and pipe to Cloudinary
        Readable.from(file.buffer).pipe(stream);
      });
    });

    const results = await Promise.all(uploadPromises);

    // Transform results to match expected format
    req.files = results.map((result) => ({
      path: result.secure_url,
      filename: result.public_id,
      size: result.bytes,
      mimetype: result.resource_type
    }));

    next();
  } catch (error) {
    next(error);
  }

export { upload, cloudinary };
export { upload, uploadToCloudinary };
export default upload;
