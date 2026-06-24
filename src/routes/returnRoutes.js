import express from 'express';
import {
  requestReturn,
  getReturns,
  updateReturnStatus,
  updateReturn
} from '../controllers/returnController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Returns require active sessions

router.route('/')
  .get(getReturns);

router.post('/request', requestReturn);

router.put('/:id', updateReturn);

router.put('/:id/status', adminOnly, updateReturnStatus);

export default router;
