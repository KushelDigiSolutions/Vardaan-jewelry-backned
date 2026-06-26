import HeroSlide from '../models/HeroSlide.js';

// Get all hero slides (Public)
export const getHeroSlides = async (req, res, next) => {
  try {
    const query = {};
    // Admin dashboard can request all slides, frontend might only fetch active ones.
    // If query parameter activeOnly is present, filter active slides
    if (req.query.activeOnly === 'true') {
      query.isActive = true;
    }
    
    const slides = await HeroSlide.find(query).sort({ order: 1 });
    res.status(200).json({ success: true, data: slides });
  } catch (error) {
    next(error);
  }
};

// Create a new hero slide (Admin Only)
export const createHeroSlide = async (req, res, next) => {
  try {
    const { image, subtitle, title, ctaText, ctaLink, order, isActive } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, message: 'Hero slide image is required' });
    }

    const slide = await HeroSlide.create({
      image,
      subtitle: subtitle || '',
      title: title || '',
      ctaText: ctaText || 'Shop Now',
      ctaLink: ctaLink || '/shop',
      order: order !== undefined ? Number(order) : 0,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({ success: true, data: slide });
  } catch (error) {
    next(error);
  }
};

// Update an existing hero slide (Admin Only)
export const updateHeroSlide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { image, subtitle, title, ctaText, ctaLink, order, isActive } = req.body;

    const slide = await HeroSlide.findById(id);
    if (!slide) {
      return res.status(404).json({ success: false, message: 'Hero slide not found' });
    }

    if (image !== undefined) slide.image = image;
    if (subtitle !== undefined) slide.subtitle = subtitle;
    if (title !== undefined) slide.title = title;
    if (ctaText !== undefined) slide.ctaText = ctaText;
    if (ctaLink !== undefined) slide.ctaLink = ctaLink;
    if (order !== undefined) slide.order = Number(order);
    if (isActive !== undefined) slide.isActive = isActive;

    await slide.save();
    res.status(200).json({ success: true, data: slide });
  } catch (error) {
    next(error);
  }
};

// Delete a hero slide (Admin Only)
export const deleteHeroSlide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const slide = await HeroSlide.findById(id);
    if (!slide) {
      return res.status(404).json({ success: false, message: 'Hero slide not found' });
    }

    await HeroSlide.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Hero slide deleted successfully' });
  } catch (error) {
    next(error);
  }
};
