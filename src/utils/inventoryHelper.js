import Product from '../models/Product.js';
import InventoryLog from '../models/InventoryLog.js';
import Notification from '../models/Notification.js';

/**
 * Deducts inventory for each item in an order.
 * Handles three inventory types:
 *   1. Full variant (variants[] — karat + metalColor + size + ...)
 *   2. Size-only (sizes[] — item.variant set, no variantDetails)
 *   3. Default (root product.inventory — no variant/size selected)
 *
 * @param {Array} orderItems - The order's items array (from Order document)
 * @param {string} orderId   - The order's _id (for logging)
 */
export const deductInventory = async (orderItems, orderId) => {
  for (const item of orderItems) {
    const prod = await Product.findById(item.product);
    if (!prod) continue;

    let isVariantProcessed = false;

    // 1. Color variant (colorImages[] array)
    if (item.variantDetails && item.variantDetails.colorOption && prod.colorImages && prod.colorImages.length > 0) {
      const cIndex = prod.colorImages.findIndex(c => c.color === item.variantDetails.colorOption);
      if (cIndex > -1) {
        prod.colorImages[cIndex].inventory = Math.max(0, (prod.colorImages[cIndex].inventory || 0) - item.quantity);
        isVariantProcessed = true;
      }
    }

    // 2. Full variant (karat + metalColor + size)
    if (!isVariantProcessed && item.variantDetails && prod.variants && prod.variants.length > 0) {
      const vIndex = prod.variants.findIndex(v =>
        v.size === item.variantDetails.size &&
        v.karat === item.variantDetails.karat &&
        v.metalColor === item.variantDetails.metalColor &&
        (v.metalType || '') === (item.variantDetails.metalType || '') &&
        (v.grossWeight || '') === (item.variantDetails.grossWeight || '') &&
        (v.netWeight || '') === (item.variantDetails.netWeight || '')
      );
      if (vIndex > -1) {
        prod.variants[vIndex].inventory = Math.max(0, prod.variants[vIndex].inventory - item.quantity);
        isVariantProcessed = true;
      }
    }

    // 2. Size-only variant (sizes[] array)
    const selectedSize = item.variantDetails?.size || item.variant;
    if (!isVariantProcessed && selectedSize && prod.sizes && prod.sizes.length > 0) {
      const sIndex = prod.sizes.findIndex(s => s.size === selectedSize);
      if (sIndex > -1) {
        prod.sizes[sIndex].inventory = Math.max(0, prod.sizes[sIndex].inventory - item.quantity);
        isVariantProcessed = true;
      }
    }

    // 3. Root inventory — only deducted if no variant or size inventory was processed
    if (!isVariantProcessed) {
      prod.inventory = Math.max(0, prod.inventory - item.quantity);
    }

    // Increment salesCount
    prod.salesCount = (prod.salesCount || 0) + item.quantity;

    await prod.save();

    await InventoryLog.create({
      product: prod._id,
      change: -item.quantity,
      type: 'sale',
      notes: `Stock deducted for Order #${orderId}`
    });

    // Low stock alert
    if (prod.inventory <= 10) {
      await Notification.create({
        title: 'Low Stock Alert',
        message: `Product "${prod.name}" (SKU: ${prod.sku}) has only ${prod.inventory} units remaining!`
      });
    }
  }
};

/**
 * Restores inventory for each item in an order (on cancellation / refund).
 * Mirrors deductInventory — handles all three inventory types.
 *
 * @param {Array} orderItems - The order's items array (from Order document)
 * @param {string} orderId   - The order's _id (for logging)
 */
export const restoreInventory = async (orderItems, orderId) => {
  for (const item of orderItems) {
    const prod = await Product.findById(item.product);
    if (!prod) continue;

    let isVariantProcessed = false;

    // 1. Color variant (colorImages[] array)
    if (item.variantDetails && item.variantDetails.colorOption && prod.colorImages && prod.colorImages.length > 0) {
      const cIndex = prod.colorImages.findIndex(c => c.color === item.variantDetails.colorOption);
      if (cIndex > -1) {
        prod.colorImages[cIndex].inventory = (prod.colorImages[cIndex].inventory || 0) + item.quantity;
        isVariantProcessed = true;
      }
    }

    // 2. Full variant (karat + metalColor + size)
    if (!isVariantProcessed && item.variantDetails && prod.variants && prod.variants.length > 0) {
      const vIndex = prod.variants.findIndex(v =>
        v.size === item.variantDetails.size &&
        v.karat === item.variantDetails.karat &&
        v.metalColor === item.variantDetails.metalColor &&
        (v.metalType || '') === (item.variantDetails.metalType || '') &&
        (v.grossWeight || '') === (item.variantDetails.grossWeight || '') &&
        (v.netWeight || '') === (item.variantDetails.netWeight || '')
      );
      if (vIndex > -1) {
        prod.variants[vIndex].inventory += item.quantity;
        isVariantProcessed = true;
      }
    }

    // 2. Size-only variant (sizes[] array)
    const selectedSize = item.variantDetails?.size || item.variant;
    if (!isVariantProcessed && selectedSize && prod.sizes && prod.sizes.length > 0) {
      const sIndex = prod.sizes.findIndex(s => s.size === selectedSize);
      if (sIndex > -1) {
        prod.sizes[sIndex].inventory += item.quantity;
        isVariantProcessed = true;
      }
    }

    // 3. Root inventory — only restored if no variant or size inventory was processed
    if (!isVariantProcessed) {
      prod.inventory += item.quantity;
    }

    await prod.save();

    await InventoryLog.create({
      product: prod._id,
      change: item.quantity,
      type: 'return',
      notes: `Stock restored for cancelled/refunded Order #${orderId}`
    });
  }
};
