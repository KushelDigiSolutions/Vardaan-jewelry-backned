import express from 'express';
import {
  getCustomers,
  toggleCustomerStatus,
  updateCustomer,
  deleteCustomer
} from '../controllers/customerController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, adminOnly); // Customers index is admin only

router.get('/', getCustomers);
router.put('/:id/status', toggleCustomerStatus);

router.route('/:id')
  .put(updateCustomer)
  .delete(deleteCustomer);

export default router;
