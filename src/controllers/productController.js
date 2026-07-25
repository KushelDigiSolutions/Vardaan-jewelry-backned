import Product from '../models/Product.js';
import Category from '../models/Category.js';
import InventoryLog from '../models/InventoryLog.js';

// Get products (with filters, search, sort, pagination)
export const getProducts = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      category, 
      minPrice, 
      maxPrice, 
      sort, 
      isActive 
    } = req.query;

    const query = {};

    // Apply filters
    if (isActive !== undefined) {
      if (isActive !== 'all') {
        query.isActive = isActive === 'true';
      }
    } else {
      query.isActive = true;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      // Find category and its subcategories if category is a parent
      const selectedCategory = await Category.findById(category);
      if (selectedCategory) {
        const subCategories = await Category.find({ parentCategory: category });
        const categoryIds = [category, ...subCategories.map(c => c._id)];
        query.$or = [
          { category: { $in: categoryIds } },
          { categories: { $in: categoryIds } }
        ];
      }
    }

    if (minPrice || maxPrice) {
      const salePriceCond = { $gt: 0 };
      if (minPrice) salePriceCond.$gte = Number(minPrice);
      if (maxPrice) salePriceCond.$lte = Number(maxPrice);

      const priceCond = {};
      if (minPrice) priceCond.$gte = Number(minPrice);
      if (maxPrice) priceCond.$lte = Number(maxPrice);

      const priceFilterOr = [
        {
          salePrice: salePriceCond
        },
        {
          $and: [
            {
              $or: [
                { salePrice: { $exists: false } },
                { salePrice: 0 },
                { salePrice: null }
              ]
            },
            {
              price: priceCond
            }
          ]
        }
      ];

      if (query.$or) {
        query.$and = query.$and || [];
        query.$and.push({ $or: priceFilterOr });
      } else {
        query.$or = priceFilterOr;
      }
    }

    // Apply sorting
    let sortOptions = {};
    if (sort === 'price_asc') {
      sortOptions.price = 1;
    } else if (sort === 'price_desc') {
      sortOptions.price = -1;
    } else if (sort === 'newest') {
      sortOptions.createdAt = -1;
    } else {
      sortOptions.createdAt = -1; // Default: newest first
    }

    // Paginate results
    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('categories', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single product by slug
export const getProductBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({ slug, isActive: true })
      .populate('category', 'name slug')
      .populate('categories', 'name slug');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// Create product (Admin)
export const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, salePrice, sku, inventory, category, categories, isActive, attributes, variants, mainImage, wearableMedia, sizes, colorImages, color } = req.body;

    const skuExists = await Product.findOne({ sku });
    if (skuExists) {
      return res.status(400).json({ success: false, message: `Product with SKU ${sku} already exists` });
    }

    // Process image URLs from Cloudinary uploads if present
    const images = [];
    if (req.files) {
      req.files.forEach(file => {
        // Cloudinary stores the URL in file.path
        images.push(file.path);
      });
    } else if (req.body.images) {
      // Allow passing URLs directly (useful for seeds / mock data)
      if (Array.isArray(req.body.images)) {
        images.push(...req.body.images);
      } else {
        images.push(req.body.images);
      }
    }

    // Ensure mainImage is at the front of images array
    const resolvedMainImage = mainImage || (images.length > 0 ? images[0] : '');
    if (resolvedMainImage && !images.includes(resolvedMainImage)) {
      images.unshift(resolvedMainImage);
    } else if (resolvedMainImage && images.indexOf(resolvedMainImage) > 0) {
      const idx = images.indexOf(resolvedMainImage);
      images.splice(idx, 1);
      images.unshift(resolvedMainImage);
    }

    let parsedAttributes = [];
    if (attributes) {
      parsedAttributes = typeof attributes === 'string' ? JSON.parse(attributes) : attributes;
    }

    let parsedVariants = [];
    if (variants) {
      parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    }

    let parsedWearableMedia = [];
    if (wearableMedia) {
      parsedWearableMedia = typeof wearableMedia === 'string' ? JSON.parse(wearableMedia) : wearableMedia;
    }

    let parsedSizes = [];
    if (sizes) {
      parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
    }

    let parsedColorImages = [];
    if (colorImages) {
      parsedColorImages = typeof colorImages === 'string' ? JSON.parse(colorImages) : colorImages;
    }

    let parsedCategories = [];
    if (categories) {
      parsedCategories = typeof categories === 'string' ? JSON.parse(categories) : categories;
    }

    let resolvedCategory = category;
    if (parsedCategories.length > 0) {
      resolvedCategory = parsedCategories[0];
    } else if (resolvedCategory && parsedCategories.length === 0) {
      parsedCategories = [resolvedCategory];
    }

    const product = await Product.create({
      name,
      description,
      price: Number(price),
      salePrice: salePrice ? Number(salePrice) : 0,
      sku,
      inventory: Number(inventory) || 0,
      category: resolvedCategory,
      categories: parsedCategories,
      images,
      mainImage: resolvedMainImage,
      color: color || '',
      wearableMedia: parsedWearableMedia,
      colorImages: parsedColorImages,
      isActive: isActive !== undefined ? isActive : true,
      attributes: parsedAttributes,
      variants: parsedVariants,
      sizes: parsedSizes
    });

    // Create entry log for stock levels
    await InventoryLog.create({
      product: product._id,
      change: product.inventory,
      type: 'stock_in',
      notes: 'Initial stocking'
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// Update product (Admin)
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, salePrice, sku, inventory, category, categories, isActive, attributes, variants, mainImage, wearableMedia, sizes, colorImages, color } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check SKU collision if SKU changed
    if (sku && sku !== product.sku) {
      const skuExists = await Product.findOne({ sku });
      if (skuExists) {
        return res.status(400).json({ success: false, message: `Product with SKU ${sku} already exists` });
      }
      product.sku = sku;
    }

    if (name) {
      product.name = name;
      product.slug = undefined; // trigger slug regeneration on validate
    }
    if (description) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (salePrice !== undefined) product.salePrice = Number(salePrice);
    
    if (categories !== undefined) {
      const parsedCategories = typeof categories === 'string' ? JSON.parse(categories) : categories;
      product.categories = parsedCategories;
      if (parsedCategories.length > 0) {
        product.category = parsedCategories[0];
      }
    } else if (category !== undefined) {
      product.category = category;
      product.categories = [category];
    }

    if (isActive !== undefined) product.isActive = isActive;

    if (attributes) {
      product.attributes = typeof attributes === 'string' ? JSON.parse(attributes) : attributes;
    }

    if (variants) {
      product.variants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    }

    if (sizes !== undefined) {
      product.sizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
    }

    if (colorImages !== undefined) {
      product.colorImages = typeof colorImages === 'string' ? JSON.parse(colorImages) : colorImages;
    }

    // Handle inventory adjustment
    if (inventory !== undefined && Number(inventory) !== product.inventory) {
      const difference = Number(inventory) - product.inventory;
      product.inventory = Number(inventory);
      
      await InventoryLog.create({
        product: product._id,
        change: difference,
        type: 'adjustment',
        notes: 'Manual inventory adjustment via product editor'
      });
    }

    // Add new files to images array if uploaded
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        // Cloudinary URL from uploadToCloudinary middleware
        product.images.push(file.path);
      });
    } else if (req.body.images) {
      product.images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
    }

    if (mainImage !== undefined) {
      product.mainImage = mainImage;
    }

    if (wearableMedia !== undefined) {
      product.wearableMedia = typeof wearableMedia === 'string' ? JSON.parse(wearableMedia) : wearableMedia;
    }

    if (color !== undefined) {
      product.color = color;
    }

    // Ensure mainImage is at the front of images array
    const resolvedMainImage = product.mainImage || (product.images.length > 0 ? product.images[0] : '');
    if (resolvedMainImage) {
      product.mainImage = resolvedMainImage;
      if (!product.images.includes(resolvedMainImage)) {
        product.images.unshift(resolvedMainImage);
      } else if (product.images.indexOf(resolvedMainImage) > 0) {
        const idx = product.images.indexOf(resolvedMainImage);
        product.images.splice(idx, 1);
        product.images.unshift(resolvedMainImage);
      }
    }

    await product.save();
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// Delete product (Admin)
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await Product.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Product removed from store successfully' });
  } catch (error) {
    next(error);
  }
};

// Bulk Import Products (Admin)
export const bulkImportProducts = async (req, res, next) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ success: false, message: 'Invalid payload: Expected an array of products' });
    }

    const imported = [];
    const errors = [];

    for (const item of products) {
      try {
        const skuExists = await Product.findOne({ sku: item.sku });
        if (skuExists) {
          errors.push({ sku: item.sku, error: 'SKU collision' });
          continue;
        }

        // Get category reference (slug lookup or fallback to default)
        let categoryId = item.category;
        if (item.categoryName) {
          let cat = await Category.findOne({ name: { $regex: new RegExp(`^${item.categoryName}$`, 'i') } });
          if (!cat) {
            cat = await Category.create({ name: item.categoryName });
          }
          categoryId = cat._id;
        }

        const resolvedMainImage = item.mainImage || (item.images && item.images.length > 0 ? item.images[0] : '');
        const imagesList = item.images || ['https://images.unsplash.com/photo-1523275335684-37898b6baf30'];
        if (resolvedMainImage && !imagesList.includes(resolvedMainImage)) {
          imagesList.unshift(resolvedMainImage);
        }

        const newProd = await Product.create({
          name: item.name,
          description: item.description || 'No description provided',
          price: Number(item.price),
          salePrice: item.salePrice ? Number(item.salePrice) : 0,
          sku: item.sku,
          inventory: Number(item.inventory) || 0,
          category: categoryId,
          categories: categoryId ? [categoryId] : [],
          images: imagesList,
          mainImage: resolvedMainImage,
          color: item.color || '',
          wearableMedia: item.wearableMedia || [],
          isActive: item.isActive !== undefined ? item.isActive : true,
          isFeatured: item.isFeatured !== undefined ? item.isFeatured : false,
          attributes: item.attributes || [],
          variants: item.variants || [],
          sizes: item.sizes || [],
          colorImages: item.colorImages || []
        });

        await InventoryLog.create({
          product: newProd._id,
          change: newProd.inventory,
          type: 'stock_in',
          notes: 'Bulk imported entry'
        });

        imported.push(newProd);
      } catch (err) {
        errors.push({ sku: item.sku || 'Unknown SKU', error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk import completed: ${imported.length} successfully imported, ${errors.length} failed.`,
      importedCount: imported.length,
      failedCount: errors.length,
      errors
    });
  } catch (error) {
    next(error);
  }
};

// Bulk Export Products (Admin)
export const bulkExportProducts = async (req, res, next) => {
  try {
    const products = await Product.find().populate('category', 'name').populate('categories', 'name');
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

// Get products by category
export const getProductsByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const products = await Product.find({
      $or: [
        { category: categoryId },
        { categories: categoryId }
      ],
      isActive: true
    }).populate('category', 'name slug').populate('categories', 'name slug');
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

// Get featured products
export const getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isFeatured: true, isActive: true })
      .populate('category', 'name slug')
      .populate('categories', 'name slug');
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

// Get best sellers
export const getBestSellers = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('category', 'name slug')
      .populate('categories', 'name slug')
      .sort({ salesCount: -1 })
      .limit(10);
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

// Get single product by ID
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('categories', 'name slug');
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// Create Product Review
export const createProductReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if user already reviewed this product
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ success: false, message: 'Product already reviewed by you' });
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ success: true, message: 'Review added successfully', data: product });
  } catch (error) {
    next(error);
  }
};


