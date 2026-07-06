import express from 'express';
import {
  requestReturn,
  getReturns,
  updateReturnStatus,
  updateReturn
} from '../controllers/returnController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import upload, { uploadToCloudinary } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect); // Returns require active sessions

router.route('/')
  .get(getReturns);

router.post(
  '/request',
  upload.fields([
    { name: 'photos', maxCount: 10 },
    { name: 'videos', maxCount: 10 }
  ]),
  uploadToCloudinary,
  requestReturn
);

router.put(
  '/:id',
  upload.fields([
    { name: 'photos', maxCount: 10 },
    { name: 'videos', maxCount: 10 }
  ]),
  uploadToCloudinary,
  updateReturn
);

router.put('/:id/status', adminOnly, updateReturnStatus);

export default router;
