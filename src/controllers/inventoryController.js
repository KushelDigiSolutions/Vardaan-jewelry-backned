import InventoryLog from '../models/InventoryLog.js';
import Product from '../models/Product.js';

// Get all inventory logs (Admin only)
export const getInventoryLogs = async (req, res, next) => {
  try {
    const logs = await InventoryLog.find()
      .populate('product', 'name sku price inventory')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

// Adjust stock level (Admin only)
export const adjustStock = async (req, res, next) => {
  try {
    const { productId, change, notes } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const adjustAmount = Number(change);
    if (isNaN(adjustAmount) || adjustAmount === 0) {
      return res.status(400).json({ success: false, message: 'Change amount must be a non-zero integer value' });
    }

    const currentInventory = product.inventory;
    const targetInventory = currentInventory + adjustAmount;

    if (targetInventory < 0) {
      return res.status(400).json({ success: false, message: `Cannot adjust. Resulting inventory would be negative (${targetInventory})` });
    }

    product.inventory = targetInventory;
    await product.save();

    const log = await InventoryLog.create({
      product: product._id,
      change: adjustAmount,
      type: 'adjustment',
      notes: notes || 'Manual dashboard inventory correction'
    });

    res.status(200).json({ success: true, data: product, log });
  } catch (error) {
    next(error);
  }
};
