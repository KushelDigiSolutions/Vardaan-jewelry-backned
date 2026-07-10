import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  variant: { type: String },
  variantDetails: {
    size: String,
    karat: String,
    metalColor: String,
    metalType: String,
    grossWeight: String,
    netWeight: String,
    price: Number,
    salePrice: Number
  }
}, { _id: false });

const trackingUpdateSchema = new mongoose.Schema({
  status: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
    mobile: { type: String, default: '' }
  },
  shippingMethod: { type: String, default: 'Standard Delivery' },
  shippingCost: { type: Number, default: 0 },
  paymentMethod: { type: String, required: true, default: 'Razorpay' },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  totalAmount: { type: Number, required: true },
  couponCode: { type: String, default: '' },
  discount: { type: Number, default: 0 },
  stockDeducted: { type: Boolean, default: false }, // true once inventory has been deducted for this order
  shiprocketOrderId: { type: String, default: '' },
  shiprocketShipmentId: { type: String, default: '' },
  tracking: {
    carrier: { type: String, default: '' },
    awb: { type: String, default: '' },
    statusHistory: [trackingUpdateSchema]
  }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;
