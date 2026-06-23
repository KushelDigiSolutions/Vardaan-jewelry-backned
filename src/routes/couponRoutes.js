import express from 'express';
import {
  createCoupon,
  getCoupons,
  deleteCoupon,
  applyCoupon
} from '../controllers/couponController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Coupons require active sessions

router.route('/')
  .post(adminOnly, createCoupon)
  .get(getCoupons);

router.post('/apply', applyCoupon);

router.delete('/:id', adminOnly, deleteCoupon);

export default router;
