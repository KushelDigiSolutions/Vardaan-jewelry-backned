import mongoose from 'mongoose';

const inventoryLogSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  change: { type: Number, required: true }, // e.g. -5 for sale, +10 for stock in
  type: {
    type: String,
    enum: ['stock_in', 'sale', 'adjustment', 'return'],
    required: true
  },
  notes: { type: String, default: '' }
}, { timestamps: true });

const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);
export default InventoryLog;
