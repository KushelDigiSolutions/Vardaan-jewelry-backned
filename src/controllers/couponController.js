import Coupon from '../models/Coupon.js';

// Create a Coupon (Admin Only)
export const createCoupon = async (req, res, next) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, startDate, expiryDate, isActive, usageLimit } = req.body;

    const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
    if (couponExists) {
      return res.status(400).json({ success: false, message: `Coupon with code ${code} already exists` });
    }

    // Validation: Discount Value & Type
    const dVal = Number(discountValue);
    if (isNaN(dVal) || dVal <= 0) {
      return res.status(400).json({ success: false, message: 'Discount value must be a valid number greater than 0' });
    }
    if (discountType === 'percentage' && (dVal < 1 || dVal > 99)) {
      return res.status(400).json({ success: false, message: 'Percentage discount must be between 1 and 99' });
    }

    // Validation: Minimum Order Amount
    if (minOrderAmount !== undefined && minOrderAmount !== null && minOrderAmount !== '') {
      const minAmt = Number(minOrderAmount);
      if (isNaN(minAmt) || minAmt < 0) {
        return res.status(400).json({ success: false, message: 'Minimum order amount must be 0 or more' });
      }
    }

    // Validation: Usage Limit
    if (usageLimit !== undefined && usageLimit !== null && usageLimit !== '') {
      const limit = Number(usageLimit);
      if (isNaN(limit) || limit < 1) {
        return res.status(400).json({ success: false, message: 'Max usage limit must be 1 or more' });
      }
    }

    const now = new Date();
    const sDate = startDate ? new Date(startDate) : now;
    const eDate = new Date(expiryDate);

    // Validation: Start Date must be today or in the future
    // Allow a small 1-minute buffer for client-server clock sync issues
    if (startDate && new Date(startDate) < new Date(now.getTime() - 60000)) {
      return res.status(400).json({ success: false, message: 'Start date and time must be today or in the future' });
    }

    // Validation: Expiry Date must be after Start Date
    if (eDate <= sDate) {
      return res.status(400).json({ success: false, message: 'Expiry date must be after the start date' });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      startDate: sDate,
      expiryDate: eDate,
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
      // For users: active, started, not expired, and not usage-exhausted
      const allActive = await Coupon.find({
        isActive: true,
        $or: [
          { startDate: { $exists: false } },
          { startDate: { $lte: new Date() } }
        ],
        expiryDate: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      // Filter out coupons that have hit their usage limit or have been used by the current user
      coupons = allActive.filter(c => {
        const withinLimit = c.usageLimit === null || c.usedCount < c.usageLimit;
        const notUsedByUser = !c.usedBy || !c.usedBy.some(id => id.toString() === req.user._id.toString());
        return withinLimit && notUsedByUser;
      });
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

    // Check if user has already used this coupon
    if (coupon.usedBy && coupon.usedBy.some(id => id.toString() === req.user._id.toString())) {
      return res.status(400).json({
        success: false,
        message: 'You have already used this coupon code'
      });
    }

    // Check if coupon is yet to start
    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      return res.status(400).json({
        success: false,
        message: `This coupon is not active yet. It will be available starting ${coupon.startDate.toLocaleString('en-IN')}`
      });
    }

    if (!coupon.isValid(Number(orderAmount), req.user._id)) {
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
export const incrementCouponUsage = async (code, userId) => {
  try {
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) return;

    coupon.usedCount += 1;

    // Add user to usedBy list
    if (userId) {
      if (!coupon.usedBy) {
        coupon.usedBy = [];
      }
      if (!coupon.usedBy.some(id => id.toString() === userId.toString())) {
        coupon.usedBy.push(userId);
      }
    }

    // Auto-deactivate if usage limit reached
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      coupon.isActive = false;
    }

    await coupon.save();
  } catch (err) {
    console.error('Failed to increment coupon usage:', err);
  }
};
