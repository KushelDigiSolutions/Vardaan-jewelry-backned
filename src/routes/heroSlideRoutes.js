import express from 'express';
import {
  getHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide
} from '../controllers/heroSlideController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getHeroSlides)
  .post(protect, adminOnly, createHeroSlide);

router.route('/:id')
  .put(protect, adminOnly, updateHeroSlide)
  .delete(protect, adminOnly, deleteHeroSlide);

export default router;
