import ReturnRequest from '../models/ReturnRequest.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import InventoryLog from '../models/InventoryLog.js';
import Notification from '../models/Notification.js';

// Request return (Customer)
export const requestReturn = async (req, res, next) => {
  try {
    const { orderId, items, refundMethod, refundDetails } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Auth check
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to request return for this order' });
    }

    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Returns can only be requested after order has been delivered' });
    }

    // Verify returning items belong to order and quantities are valid
    const returnItems = [];
    for (const item of items) {
      const orderItem = order.items.find(o => o.product.toString() === item.productId);
      if (!orderItem) {
        return res.status(400).json({ success: false, message: `Product ${item.name} not found in this order` });
      }
      if (item.quantity > orderItem.quantity) {
        return res.status(400).json({ success: false, message: `Returned quantity exceeds ordered quantity for ${item.name}` });
      }

      returnItems.push({
        product: item.productId,
        name: orderItem.name,
        quantity: Number(item.quantity),
        price: orderItem.price,
        reason: item.reason || 'Product wrong size/defective'
      });
    }

    // Refund details validations
    if (refundMethod === 'upi' && !refundDetails.upiId) {
      return res.status(400).json({ success: false, message: 'UPI ID is required for UPI refunds' });
    }
    if (refundMethod === 'bank' && (!refundDetails.accountNo || !refundDetails.ifsc || !refundDetails.bankName || !refundDetails.holderName)) {
      return res.status(400).json({ success: false, message: 'Complete Bank Details are required for Bank refunds' });
    }

    const returnRequest = await ReturnRequest.create({
      order: orderId,
      user: req.user._id,
      items: returnItems,
      refundMethod,
      refundDetails,
      status: 'pending'
    });

    // Alert Admin
    await Notification.create({
      title: 'New Return Request',
      message: `Return requested for Order #${orderId} by customer ${req.user.name}`
    });

    res.status(201).json({ success: true, message: 'Return request submitted successfully', data: returnRequest });
  } catch (error) {
    next(error);
  }
};

// List Return Requests (Admin: all, Customer: theirs)
export const getReturns = async (req, res, next) => {
  try {
    let returns;
    if (req.user.role === 'admin') {
      returns = await ReturnRequest.find()
        .populate('user', 'name email')
        .populate('order', 'totalAmount paymentStatus')
        .sort({ createdAt: -1 });
    } else {
      returns = await ReturnRequest.find({ user: req.user._id })
        .populate('order', 'totalAmount paymentStatus')
        .sort({ createdAt: -1 });
    }
    res.status(200).json({ success: true, data: returns });
  } catch (error) {
    next(error);
  }
};

// Update Return Status (Admin: Approve/Reject/Refund)
export const updateReturnStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body; // approved, rejected, refunded

    const returnReq = await ReturnRequest.findById(id).populate('user', 'name email');
    if (!returnReq) {
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    if (returnReq.status === 'refunded' || returnReq.status === 'rejected') {
      return res.status(400).json({ success: false, message: `Return request is already ${returnReq.status}` });
    }

    const previousStatus = returnReq.status;
    returnReq.status = status;
    if (adminNotes) returnReq.adminNotes = adminNotes;

    await returnReq.save();

    // If approved, restore stock inventory
    if (status === 'approved' && previousStatus !== 'approved') {
      for (const item of returnReq.items) {
        const prod = await Product.findById(item.product);
        if (prod) {
          prod.inventory += item.quantity;
          await prod.save();

          await InventoryLog.create({
            product: prod._id,
            change: item.quantity,
            type: 'return',
            notes: `Stock returned from approved Return Request #${returnReq._id}`
          });
        }
      }

      await Notification.create({
        user: returnReq.user._id,
        title: 'Return Request Approved',
        message: `Your return request for Order #${returnReq.order} has been approved. Refund is being processed.`
      });
    }

    if (status === 'refunded') {
      await Notification.create({
        user: returnReq.user._id,
        title: 'Refund Processed',
        message: `Refund of ₹${returnReq.items.reduce((sum, i) => sum + (i.price * i.quantity), 0)} has been processed to your requested ${returnReq.refundMethod === 'upi' ? 'UPI' : 'Bank Account'}.`
      });
    }

    if (status === 'rejected') {
      await Notification.create({
        user: returnReq.user._id,
        title: 'Return Request Rejected',
        message: `Your return request for Order #${returnReq.order} has been rejected. Details: ${adminNotes || 'Contact support.'}`
      });
    }

    res.status(200).json({ success: true, message: `Return request status updated to ${status}`, data: returnReq });
  } catch (error) {
    next(error);
  }
};

// Update return request (Customer)
export const updateReturn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items, refundMethod, refundDetails } = req.body;

    const returnRequest = await ReturnRequest.findById(id);
    if (!returnRequest) {
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    // Auth check
    if (returnRequest.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this return request' });
    }

    // Status check - only pending returns can be edited
    if (returnRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending return requests can be modified' });
    }

    const order = await Order.findById(returnRequest.order);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify returning items belong to order and quantities are valid
    const returnItems = [];
    for (const item of items) {
      const orderItem = order.items.find(o => o.product.toString() === item.productId);
      if (!orderItem) {
        return res.status(400).json({ success: false, message: `Product ${item.name} not found in this order` });
      }
      if (item.quantity > orderItem.quantity) {
        return res.status(400).json({ success: false, message: `Returned quantity exceeds ordered quantity for ${item.name}` });
      }

      returnItems.push({
        product: item.productId,
        name: orderItem.name,
        quantity: Number(item.quantity),
        price: orderItem.price,
        reason: item.reason || 'Product wrong size/defective'
      });
    }

    // Refund details validations
    if (refundMethod === 'upi' && !refundDetails.upiId) {
      return res.status(400).json({ success: false, message: 'UPI ID is required for UPI refunds' });
    }
    if (refundMethod === 'bank' && (!refundDetails.accountNo || !refundDetails.ifsc || !refundDetails.bankName || !refundDetails.holderName)) {
      return res.status(400).json({ success: false, message: 'Complete Bank Details are required for Bank refunds' });
    }

    returnRequest.items = returnItems;
    returnRequest.refundMethod = refundMethod;
    returnRequest.refundDetails = refundDetails;

    await returnRequest.save();

    res.status(200).json({ success: true, message: 'Return request updated successfully', data: returnRequest });
  } catch (error) {
    next(error);
  }
};
