import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, default: 0, min: 0 },
  sku: { type: String, required: true, unique: true, index: true },
  inventory: { type: Number, required: true, default: 0, min: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  images: [{ type: String }],
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  salesCount: { type: Number, default: 0, min: 0 },
  attributes: [
    {
      key: { type: String, required: true }, // e.g. Color, Size
      value: { type: String, required: true } // e.g. Red, XL
    }
  ],
  variants: [
    {
      karat: { type: String, required: true },
      metalColor: { type: String, required: true },
      size: { type: String, required: true },
      price: { type: Number, required: true },
      salePrice: { type: Number, default: 0 },
      inventory: { type: Number, default: 0 },
      metalType: { type: String, default: 'Gold' },
      grossWeight: { type: String, default: '' },
      netWeight: { type: String, default: '' }
    }
  ],
  reviews: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      comment: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  numReviews: { type: Number, default: 0 },
  rating: { type: Number, default: 0 }
}, { timestamps: true });

// Pre-validate slug creation
productSchema.pre('validate', function(next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;
