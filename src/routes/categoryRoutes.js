import express from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import upload, { uploadToCloudinary } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Upload category image (Admin)
router.post('/upload', protect, adminOnly, upload.single('image'), uploadToCloudinary, (req, res) => {
  if (req.files && req.files.length > 0) {
    res.status(200).json({
      success: true,
      url: req.files[0].path
    });
  } else {
    res.status(400).json({ success: false, message: 'No file uploaded' });
  }
});

router.route('/')
  .get(getCategories)
  .post(protect, adminOnly, upload.single('image'), uploadToCloudinary, createCategory);

router.route('/:id')
  .put(protect, adminOnly, upload.single('image'), uploadToCloudinary, updateCategory)
  .delete(protect, adminOnly, deleteCategory);

export default router;
