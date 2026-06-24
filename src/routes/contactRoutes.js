import express from 'express';
import {
  createContactMessage,
  getContactMessages,
  updateContactMessageStatus
} from '../controllers/contactController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(createContactMessage)
  .get(protect, adminOnly, getContactMessages);

router.route('/:id')
  .put(protect, adminOnly, updateContactMessageStatus);

export default router;
