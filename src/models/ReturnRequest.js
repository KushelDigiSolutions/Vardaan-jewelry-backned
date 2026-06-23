import mongoose from 'mongoose';

const returnedItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  reason: { type: String, default: 'Defective product / wrong variant size' }
}, { _id: false });

const returnRequestSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [returnedItemSchema],
  refundMethod: { type: String, enum: ['upi', 'bank'], required: true },
  refundDetails: {
    upiId: { type: String, default: '' },
    accountNo: { type: String, default: '' },
    bankName: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    holderName: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'refunded'],
    default: 'pending'
  },
  adminNotes: { type: String, default: '' }
}, { timestamps: true });

const ReturnRequest = mongoose.model('ReturnRequest', returnRequestSchema);
export default ReturnRequest;
