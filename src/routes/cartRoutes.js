import express from 'express';
import {
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
  updateCartItem
} from '../controllers/cartController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Ensure all cart operations are authenticated

router.route('/')
  .get(getCart)
  .put(updateCartItem)
  .delete(clearCart);

router.post('/add', addToCart);
router.post('/remove', removeFromCart);

export default router;
