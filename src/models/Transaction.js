import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  amount: { type: Number, required: true },
  paymentGateway: { type: String, required: true, default: 'Razorpay' },
  transactionId: { type: String, required: true, unique: true },
  status: { type: String, required: true }, // e.g. success, captured, failed
  paymentDetails: { type: Object } // Holds response payload from gateway
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
