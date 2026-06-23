import express from 'express';
import {
  checkoutOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  shipOrder,
  trackOrder,
  cancelOrder
} from '../controllers/orderController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All order routes require authenticated sessions

router.route('/')
  .get(getOrders);

router.post('/checkout', checkoutOrder);

router.route('/:id')
  .get(getOrderById);

router.put('/:id/status', adminOnly, updateOrderStatus);
router.post('/:id/ship', adminOnly, shipOrder);
router.get('/:id/track', trackOrder);
router.post('/:id/cancel', cancelOrder);

export default router;
