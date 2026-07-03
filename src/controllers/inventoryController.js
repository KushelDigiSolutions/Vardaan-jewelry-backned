import InventoryLog from '../models/InventoryLog.js';
import Product from '../models/Product.js';

// Get all inventory logs (Admin only) — supports search and pagination
export const getInventoryLogs = async (req, res, next) => {
  try {
    const { search, type, page = 1, limit = 15 } = req.query;

    const query = {};
    if (type && type !== 'all') {
      query.type = type;
    }

    // We need to join with product to filter by name/sku, so populate first then filter
    const allLogs = await InventoryLog.find(query)
      .populate('product', 'name sku price inventory')
      .sort({ createdAt: -1 });

    // Apply search filter if provided
    let filtered = allLogs;
    if (search && search.trim() !== '') {
      const term = search.trim().toLowerCase();
      filtered = allLogs.filter(log => {
        const name = (log.product?.name || '').toLowerCase();
        const sku = (log.product?.sku || '').toLowerCase();
        const notes = (log.notes || '').toLowerCase();
        return name.includes(term) || sku.includes(term) || notes.includes(term);
      });
    }

    // Paginate
    const total = filtered.length;
    const skip = (Number(page) - 1) * Number(limit);
    const paginated = filtered.slice(skip, skip + Number(limit));

    res.status(200).json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Adjust stock level (Admin only) — supports top-level and per-size adjustment
export const adjustStock = async (req, res, next) => {
  try {
    const { productId, change, notes, size } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const adjustAmount = Number(change);
    if (isNaN(adjustAmount) || adjustAmount === 0) {
      return res.status(400).json({ success: false, message: 'Change amount must be a non-zero integer value' });
    }

    let logNotes = notes || 'Manual dashboard inventory correction';

    if (size && size.trim() !== '') {
      // Per-size adjustment
      const sizeIndex = product.sizes.findIndex(s => s.size === size);
      if (sizeIndex === -1) {
        return res.status(400).json({ success: false, message: `Size "${size}" not found on this product` });
      }
      const currentSizeInventory = product.sizes[sizeIndex].inventory || 0;
      const newSizeInventory = currentSizeInventory + adjustAmount;
      if (newSizeInventory < 0) {
        return res.status(400).json({ success: false, message: `Cannot adjust size "${size}". Result would be negative (${newSizeInventory})` });
      }
      product.sizes[sizeIndex].inventory = newSizeInventory;
      logNotes = `${logNotes} [Size: ${size}]`;
    } else {
      // Top-level product inventory adjustment
      const currentInventory = product.inventory;
      const targetInventory = currentInventory + adjustAmount;
      if (targetInventory < 0) {
        return res.status(400).json({ success: false, message: `Cannot adjust. Resulting inventory would be negative (${targetInventory})` });
      }
      product.inventory = targetInventory;
    }

    await product.save();

    const log = await InventoryLog.create({
      product: product._id,
      change: adjustAmount,
      type: 'adjustment',
      notes: logNotes
    });

    res.status(200).json({ success: true, data: product, log });
  } catch (error) {
    next(error);
  }
};
