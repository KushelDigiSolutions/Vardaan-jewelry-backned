import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ['percentage', 'flat'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  minOrderAmount: { type: Number, default: 0, min: 0 },
  expiryDate: { type: Date, required: true },
  usageLimit: { type: Number, default: null }, // null = unlimited
  usedCount: { type: Number, default: 0 },
  usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Check if coupon is valid
couponSchema.methods.isValid = function (orderAmount, userId = null) {
  const now = new Date();
  const withinUsageLimit = this.usageLimit === null || this.usedCount < this.usageLimit;
  const notUsedByUser = !userId || !this.usedBy || !this.usedBy.some(id => id.toString() === userId.toString());
  return (
    this.isActive &&
    now <= this.expiryDate &&
    orderAmount >= this.minOrderAmount &&
    withinUsageLimit &&
    notUsedByUser
  );
};

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
