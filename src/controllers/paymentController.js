import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import Product from '../models/Product.js';
import InventoryLog from '../models/InventoryLog.js';
import Notification from '../models/Notification.js';
import { sendEmail } from '../utils/email.js';
import { getInvoiceEmailTemplate } from '../utils/emailTemplates.js';

// Initiate simulated Payment Gateway transaction
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

    // Mock response payload from Razorpay/Stripe checkout session creation
    const mockSession = {
      gatewayOrderId: `order_pay_${Math.floor(100000 + Math.random() * 900000)}`,
      amount: order.totalAmount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_12345'
    };

    res.status(200).json({ success: true, data: mockSession });
  } catch (error) {
    next(error);
  }
};

// Verify simulated Payment Gateway transaction (Client returns payload)
export const verifyPayment = async (req, res, next) => {
  try {
    const { orderId, gatewayTransactionId, status = 'success' } = req.body;

    const order = await Order.findById(orderId).populate('user', 'name email');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (status !== 'success') {
      order.paymentStatus = 'failed';
      order.tracking.statusHistory.push({
        status: 'pending',
        message: 'Payment verification failed at gateway'
      });
      await order.save();
      return res.status(400).json({ success: false, message: 'Payment failed' });
    }

    // Update payment details
    order.paymentStatus = 'paid';
    order.orderStatus = 'confirmed';
    order.tracking.statusHistory.push({
      status: 'confirmed',
      message: `Payment successful via ${order.paymentMethod}. Transaction ID: ${gatewayTransactionId}`
    });

    await order.save();

    // Create Audit ledger transaction
    await Transaction.create({
      order: order._id,
      amount: order.totalAmount,
      paymentGateway: order.paymentMethod,
      transactionId: gatewayTransactionId || `pay_${Math.random().toString(36).substring(7)}`,
      status: 'captured',
      paymentDetails: { gatewayOrderId: `order_pay_${order._id}`, method: order.paymentMethod }
    });

    // Subtract Inventory stock levels
    for (const item of order.items) {
      const prod = await Product.findById(item.product);
      if (prod) {
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
    await sendEmail({
      to: order.user.email,
      subject: `Invoice for Order #${order._id} - Vardaan Store`,
      text: `Dear ${order.user.name},\n\nWe have received payment for your order #${order._id}.\nTotal amount: ₹${order.totalAmount}\n\nYour items will be shipped shortly!`,
      html: getInvoiceEmailTemplate(order)
    });

    res.status(200).json({ success: true, message: 'Payment successfully captured and order placed', data: order });
  } catch (error) {
    next(error);
  }
};
