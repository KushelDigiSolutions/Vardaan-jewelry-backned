import express from 'express';
import {
  getInventoryLogs,
  adjustStock
} from '../controllers/inventoryController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, adminOnly); // Inventory management is admin only

router.get('/logs', getInventoryLogs);
router.post('/adjust', adjustStock);

export default router;
