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

// File filter (Only allow image and video types)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // Increase limit to 50MB for video uploads
});

// Custom middleware to upload to Cloudinary
const uploadToCloudinary = async (req, res, next) => {
  try {
    // Standardize req.file to req.files if upload.single was used
    if (req.file && (!req.files || req.files.length === 0)) {
      req.files = [req.file];
    }

    if (!req.files || req.files.length === 0) {
      return next();
    }

    // Upload each file to Cloudinary
    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        const isVideo = file.mimetype.startsWith('video/');
        const uploadOptions = {
          folder: 'ecom-uploads',
          resource_type: isVideo ? 'video' : 'image',
        };

        if (!isVideo) {
          uploadOptions.allowed_formats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
          uploadOptions.transformation = [
            { width: 800, height: 800, crop: 'limit', quality: 'auto' }
          ];
        }

        const stream = cloudinary.uploader.upload_stream(
          uploadOptions,
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
};

export { upload, uploadToCloudinary, cloudinary };
export default upload;
