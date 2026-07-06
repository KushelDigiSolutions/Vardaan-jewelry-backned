import mongoose from 'mongoose';

const returnedItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  reason: { type: String, default: '' }
}, { _id: false });

const returnRequestSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [returnedItemSchema],
  reason: { type: String, required: true },
  description: { type: String, required: true },
  photos: [{ type: String }], // Cloudinary URLs of the uploaded photos
  videos: [{ type: String }], // Cloudinary URLs of the uploaded videos
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'replaced'],
    default: 'pending'
  },
  adminNotes: { type: String, default: '' }
}, { timestamps: true });

const ReturnRequest = mongoose.model('ReturnRequest', returnRequestSchema);
export default ReturnRequest;
