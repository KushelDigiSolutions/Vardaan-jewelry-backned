import express from 'express';
import {
  getProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkImportProducts,
  bulkExportProducts,
  
  // Phase 2 additions
  getProductsByCategory,
  getFeaturedProducts,
  getBestSellers,
  getProductById,
  createProductReview
} from '../controllers/productController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import { uploadToCloudinary } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Bulk actions
router.post('/import', protect, adminOnly, bulkImportProducts);
router.get('/export', protect, adminOnly, bulkExportProducts);

// Specific queries (placed above wildcards)
router.get('/featured', getFeaturedProducts);
router.get('/best-sellers', getBestSellers);
router.get('/category/:categoryId', getProductsByCategory);
router.get('/details/:id', getProductById);
router.get('/slug/:slug', getProductBySlug);

// Upload files (Admin)
router.post('/upload', protect, adminOnly, upload.array('file', 5), uploadToCloudinary, (req, res) => {
  if (req.files && req.files.length > 0) {
    res.status(200).json({
      success: true,
      files: req.files.map(f => ({
        url: f.path,
        mediaType: f.mimetype === 'video' || (typeof f.mimetype === 'string' && f.mimetype.startsWith('video/')) ? 'video' : 'image'
      }))
    });
  } else {
    res.status(400).json({ success: false, message: 'No files uploaded' });
  }
});

// Generic CRUD
router.route('/')
  .get(getProducts)
  .post(protect, adminOnly, upload.array('images', 5), uploadToCloudinary, createProduct);

router.route('/:id')
  .get(getProductById)
  .put(protect, adminOnly, upload.array('images', 5), uploadToCloudinary, updateProduct)
  .delete(protect, adminOnly, deleteProduct);

// Review submission
router.post('/:id/reviews', protect, createProductReview);

export default router;
