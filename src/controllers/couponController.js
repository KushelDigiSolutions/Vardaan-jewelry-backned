import Coupon from '../models/Coupon.js';

// Create a Coupon (Admin Only)
export const createCoupon = async (req, res, next) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, expiryDate, isActive, usageLimit } = req.body;

    const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
    if (couponExists) {
      return res.status(400).json({ success: false, message: `Coupon with code ${code} already exists` });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      expiryDate: new Date(expiryDate),
      usageLimit: usageLimit ? Number(usageLimit) : null, // null = unlimited
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    next(error);
  }
};

// List all Coupons (Admin gets all, Customer gets active + within usage limit only)
export const getCoupons = async (req, res, next) => {
  try {
    let coupons;
    if (req.user && req.user.role === 'admin') {
      coupons = await Coupon.find().sort({ createdAt: -1 });
    } else {
      // For users: active, not expired, and not usage-exhausted
      const allActive = await Coupon.find({
        isActive: true,
        expiryDate: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      // Filter out coupons that have hit their usage limit
      coupons = allActive.filter(c => c.usageLimit === null || c.usedCount < c.usageLimit);
    }
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    next(error);
  }
};

// Delete Coupon (Admin Only)
export const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    res.status(200).json({ success: true, message: 'Coupon code deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Apply Coupon API (Verifies and returns calculated discount — does NOT increment usedCount yet)
export const applyCoupon = async (req, res, next) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code || !orderAmount) {
      return res.status(400).json({ success: false, message: 'Coupon code and order amount are required' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    }

    // Check usage limit before isValid
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has reached its maximum usage limit'
      });
    }

    if (!coupon.isValid(Number(orderAmount))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Coupon is either expired, inactive, or your cart total is below the minimum limit' 
      });
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (coupon.discountValue / 100) * Number(orderAmount);
    } else {
      discount = coupon.discountValue;
    }

    // Discount cannot exceed order value
    discount = Math.min(discount, Number(orderAmount));

    res.status(200).json({ 
      success: true, 
      message: `Coupon applied: discount of ₹${discount} calculated`,
      data: {
        code: coupon.code,
        discount,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        usageLimit: coupon.usageLimit,
        usedCount: coupon.usedCount,
        remainingUses: coupon.usageLimit !== null ? coupon.usageLimit - coupon.usedCount : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// Increment Coupon usage count after successful order (called internally from orderController)
export const incrementCouponUsage = async (code) => {
  try {
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) return;

    coupon.usedCount += 1;

    // Auto-deactivate if usage limit reached
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      coupon.isActive = false;
    }

    await coupon.save();
  } catch (err) {
    console.error('Failed to increment coupon usage:', err);
  }
};
