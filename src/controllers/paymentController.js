import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import Product from '../models/Product.js';
import InventoryLog from '../models/InventoryLog.js';
import Notification from '../models/Notification.js';
import { sendEmail } from '../utils/email.js';
import { getInvoiceEmailTemplate } from '../utils/emailTemplates.js';
import { createShiprocketOrder } from '../utils/shiprocket.js';

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

    await order.save();

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

    // Subtract Inventory stock levels
    for (const item of order.items) {
      const prod = await Product.findById(item.product);
      if (prod) {
        // Handle variant inventory if variantDetails is defined
        if (item.variantDetails && prod.variants && prod.variants.length > 0) {
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
          }
        }
        prod.inventory = Math.max(0, prod.inventory - item.quantity);
        await prod.save();

        await InventoryLog.create({
          product: prod._id,
          change: -item.quantity,
          type: 'sale',
          notes: `Stock subtracted on checkout Order #${order._id}`
        });

        // Trigger stock alert if under limits
        if (prod.inventory <= 10) {
          await Notification.create({
            title: 'Low Stock Alert',
            message: `Product "${prod.name}" (SKU: ${prod.sku}) has only ${prod.inventory} units remaining!`
          });
        }
      }
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
