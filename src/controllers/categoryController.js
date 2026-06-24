import Category from '../models/Category.js';

// Get all categories
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().populate('parentCategory', 'name slug');
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

// Create a category
export const createCategory = async (req, res, next) => {
  try {
    const { name, parentCategory, isActive, image, description } = req.body;

    // Process image URL from Cloudinary upload if present
    let imageUrl = image || '';
    if (req.files && req.files.length > 0) {
      imageUrl = req.files[0].path;
    } else if (req.file) {
      imageUrl = req.file.path;
    }

    const parent = parentCategory || null;
    const category = await Category.create({
      name,
      parentCategory: parent,
      isActive: isActive !== undefined ? isActive : true,
      image: imageUrl,
      description: description || ''
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// Update a category
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, parentCategory, isActive, image, description } = req.body;

    // Process image URL from Cloudinary upload if present
    let imageUrl = image;
    if (req.files && req.files.length > 0) {
      imageUrl = req.files[0].path;
    } else if (req.file) {
      imageUrl = req.file.path;
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (name) {
      category.name = name;
      category.slug = undefined; // Trigger re-validation and slug generation
    }
    if (parentCategory !== undefined) category.parentCategory = parentCategory || null;
    if (isActive !== undefined) category.isActive = isActive;
    if (imageUrl !== undefined) category.image = imageUrl;
    if (description !== undefined) category.description = description;

    await category.save();
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// Delete a category
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Check if category is used as a parent for other subcategories
    const isParent = await Category.findOne({ parentCategory: id });
    if (isParent) {
      return res.status(400).json({ success: false, message: 'Cannot delete category with active subcategories' });
    }

    await Category.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};
