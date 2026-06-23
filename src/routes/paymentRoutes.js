import express from 'express';
import {
  initiatePayment,
  verifyPayment
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Ensure payments are linked to a session

router.post('/initiate', initiatePayment);
router.post('/verify', verifyPayment);

export default router;
