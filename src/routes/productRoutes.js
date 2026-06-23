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
