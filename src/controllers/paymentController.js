import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import { sendEmail } from '../utils/email.js';
import { getInvoiceEmailTemplate } from '../utils/emailTemplates.js';
import { createShiprocketOrder } from '../utils/shiprocket.js';
import { deductInventory } from '../utils/inventoryHelper.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Initiate real Razorpay Payment Gateway transaction
export const initiatePayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'This order is already paid' });
    }

    const options = {
      amount: Math.round(order.totalAmount * 100), // amount in paise
      currency: 'INR',
      receipt: `receipt_order_${order._id}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      data: {
        gatewayOrderId: razorpayOrder.id,
        amount: order.totalAmount,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    next(error);
  }
};

// Verify real Razorpay Payment Gateway transaction
export const verifyPayment = async (req, res, next) => {
  try {
    const {
      orderId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    } = req.body;

    const order = await Order.findById(orderId).populate('user', 'name email mobile');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      order.paymentStatus = 'failed';
      order.tracking.statusHistory.push({
        status: 'pending',
        message: 'Payment signature verification failed'
      });
      await order.save();
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Update payment details
    order.paymentStatus = 'paid';
    order.orderStatus = 'confirmed';
    order.tracking.statusHistory.push({
      status: 'confirmed',
      message: `Payment successful via ${order.paymentMethod}. Transaction ID: ${razorpay_payment_id}`
    });

    // Auto-register Online orders in Shiprocket immediately on payment success
    try {
      const populatedOrder = await Order.findById(order._id)
        .populate('user', 'name email mobile')
        .populate('items.product', 'sku');
      const srDetails = await createShiprocketOrder(populatedOrder, order.user);
      order.shiprocketOrderId = srDetails.shiprocketOrderId;
      order.shiprocketShipmentId = srDetails.shipmentId;
      order.tracking.statusHistory.push({
        status: 'confirmed',
        message: `Order registered in Shiprocket. Shipment ID: ${srDetails.shipmentId}`
      });
    } catch (srErr) {
      console.error('Auto Shiprocket creation failed for online order:', srErr);
      order.tracking.statusHistory.push({
        status: 'confirmed',
        message: `Payment verified. Shiprocket order registration failed: ${srErr.message || srErr}`
      });
    }

    // Mark stock deducted and save order
    order.stockDeducted = true;
    await order.save();

    // Clear the user's cart now that payment is confirmed
    // (cart was kept intact during checkout to allow retry if payment was cancelled)
    try {
      const cart = await Cart.findOne({ user: order.user._id });
      if (cart) {
        cart.items = [];
        await cart.save();
      }
    } catch (cartErr) {
      console.error('Failed to clear cart after successful payment:', cartErr);
    }

    // Create Audit ledger transaction
    await Transaction.create({
      order: order._id,
      amount: order.totalAmount,
      paymentGateway: order.paymentMethod,
      transactionId: razorpay_payment_id,
      status: 'captured',
      paymentDetails: {
        gatewayOrderId: razorpay_order_id,
        method: order.paymentMethod,
        razorpaySignature: razorpay_signature
      }
    });

    // Deduct inventory using shared helper (handles variants[], sizes[], and root inventory)
    try {
      await deductInventory(order.items, order._id);
    } catch (invErr) {
      console.error('Inventory deduction failed after payment verification:', invErr);
    }

    // Customer Notification
    await Notification.create({
      user: order.user._id,
      title: 'Payment Successful',
      message: `Your payment of ₹${order.totalAmount} for Order #${order._id} was successfully verified.`
    });

    // Invoice Email
    try {
      await sendEmail({
        to: order.user.email,
        subject: `Invoice for Order #${order._id} - Vardaan Store`,
        text: `Dear ${order.user.name},\n\nWe have received payment for your order #${order._id}.\nTotal amount: ₹${order.totalAmount}\n\nYour items will be shipped shortly!`,
        html: getInvoiceEmailTemplate(order)
      });
    } catch (err) {
      console.error("Failed to send invoice email:", err);
    }

    res.status(200).json({ success: true, message: 'Payment successfully captured and order placed', data: order });
  } catch (error) {
    next(error);
  }
};
