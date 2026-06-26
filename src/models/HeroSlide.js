import mongoose from 'mongoose';

const heroSlideSchema = new mongoose.Schema({
  image: { type: String, required: true },
  subtitle: { type: String, default: '' },
  title: { type: String, default: '' },
  ctaText: { type: String, default: 'Shop Now' },
  ctaLink: { type: String, default: '/shop' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const HeroSlide = mongoose.model('HeroSlide', heroSlideSchema);
export default HeroSlide;
