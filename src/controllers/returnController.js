import ReturnRequest from '../models/ReturnRequest.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import InventoryLog from '../models/InventoryLog.js';
import Notification from '../models/Notification.js';
import { sendEmail } from '../utils/email.js';
import { getReturnRequestedEmailTemplate, getReturnStatusUpdateEmailTemplate } from '../utils/emailTemplates.js';

// Request return/replacement (Customer)
export const requestReturn = async (req, res, next) => {
  try {
    const { orderId, reason, description } = req.body;
    let items = req.body.items;

    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid items format' });
      }
    }

    if (!orderId || !items || !reason || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields (orderId, items, reason, description)' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Auth check
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to request replacement for this order' });
    }

    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Replacements can only be requested after order has been delivered' });
    }

    // Verify order is online payment (not COD)
    if (order.paymentMethod === 'COD') {
      return res.status(400).json({ success: false, message: 'Replacements are only available for online orders' });
    }

    // Verify delivery is within 24 hours
    const deliveredStatus = order.tracking?.statusHistory?.find(
      (h) => h.status && h.status.toLowerCase() === 'delivered'
    );
    const deliveryTime = deliveredStatus ? new Date(deliveredStatus.timestamp) : new Date(order.updatedAt);
    const hoursSinceDelivery = (new Date() - deliveryTime) / (1000 * 60 * 60);

    if (hoursSinceDelivery > 24) {
      return res.status(400).json({ success: false, message: 'Replacement requests can only be made within 24 hours of delivery' });
    }

    // Verify returning items belong to order and quantities are valid
    const returnItems = [];
    for (const item of items) {
      const orderItem = order.items.find(o => o.product.toString() === item.productId);
      if (!orderItem) {
        return res.status(400).json({ success: false, message: `Product ${item.name} not found in this order` });
      }
      if (item.quantity > orderItem.quantity) {
        return res.status(400).json({ success: false, message: `Replacement quantity exceeds ordered quantity for ${item.name}` });
      }

      returnItems.push({
        product: item.productId,
        name: orderItem.name,
        quantity: Number(item.quantity),
        price: orderItem.price,
        reason: item.reason || reason
      });
    }

    // File validation: must upload at least 1 photo and 1 video
    if (!req.files || !req.files.photos || req.files.photos.length === 0) {
      return res.status(400).json({ success: false, message: 'At least 1 photo must be uploaded for replacement request' });
    }
    if (!req.files || !req.files.videos || req.files.videos.length === 0) {
      return res.status(400).json({ success: false, message: 'At least 1 video must be uploaded for replacement request' });
    }

    const photoUrls = req.files.photos.map(file => file.path);
    const videoUrls = req.files.videos.map(file => file.path);

    const returnRequest = await ReturnRequest.create({
      order: orderId,
      user: req.user._id,
      items: returnItems,
      reason,
      description,
      photos: photoUrls,
      videos: videoUrls,
      status: 'pending'
    });

    // Alert Admin
    await Notification.create({
      title: 'New Replacement Request',
      message: `Replacement requested for Order #${orderId} by customer ${req.user.name}`
    });

    // Send email to customer
    try {
      const emailHtml = getReturnRequestedEmailTemplate(order, returnRequest, req.user.name);
      await sendEmail({
        to: req.user.email,
        subject: `Vardaan - Replacement Request Received for Order #${order._id}`,
        html: emailHtml,
        text: `Hello ${req.user.name}, we have received your replacement request for Order #${order._id}. Status: PENDING.`
      });
    } catch (emailErr) {
      console.error('Error sending replacement confirmation email:', emailErr);
    }

    res.status(201).json({ success: true, message: 'Replacement request submitted successfully', data: returnRequest });
  } catch (error) {
    next(error);
  }
};

// List Return/Replacement Requests (Admin: all, Customer: theirs)
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

// Update Return/Replacement Status (Admin: Approve/Reject/Replace)
export const updateReturnStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body; // approved, rejected, replaced

    const returnReq = await ReturnRequest.findById(id).populate('user', 'name email').populate('order');
    if (!returnReq) {
      return res.status(404).json({ success: false, message: 'Replacement request not found' });
    }

    if (returnReq.status === 'replaced' || returnReq.status === 'rejected') {
      return res.status(400).json({ success: false, message: `Replacement request is already ${returnReq.status}` });
    }

    const previousStatus = returnReq.status;
    returnReq.status = status;
    if (adminNotes) returnReq.adminNotes = adminNotes;

    await returnReq.save();

    // If approved, restore stock inventory or adjust logs
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
            notes: `Stock returned for replacement from approved Request #${returnReq._id}`
          });
        }
      }

      await Notification.create({
        user: returnReq.user._id,
        title: 'Replacement Request Approved',
        message: `Your replacement request for Order #${returnReq.order} has been approved.`
      });
    }

    if (status === 'replaced') {
      await Notification.create({
        user: returnReq.user._id,
        title: 'Replacement Processed',
        message: `Replacement items for Order #${returnReq.order} have been processed and dispatched.`
      });
    }

    if (status === 'rejected') {
      await Notification.create({
        user: returnReq.user._id,
        title: 'Replacement Request Rejected',
        message: `Your replacement request for Order #${returnReq.order} has been rejected. Details: ${adminNotes || 'Contact support.'}`
      });
    }

    // Send email to customer on status change
    try {
      const emailHtml = getReturnStatusUpdateEmailTemplate(returnReq.order, returnReq, returnReq.user.name);
      await sendEmail({
        to: returnReq.user.email,
        subject: `Vardaan - Replacement Request Status Update for Order #${returnReq.order._id}`,
        html: emailHtml,
        text: `Hello ${returnReq.user.name}, the status of your replacement request for Order #${returnReq.order._id} has been updated to "${status}".`
      });
    } catch (emailErr) {
      console.error('Error sending status update email:', emailErr);
    }

    res.status(200).json({ success: true, message: `Replacement request status updated to ${status}`, data: returnReq });
  } catch (error) {
    next(error);
  }
};

// Update return/replacement request (Customer)
export const updateReturn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;
    let items = req.body.items;

    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid items format' });
      }
    }

    const returnRequest = await ReturnRequest.findById(id);
    if (!returnRequest) {
      return res.status(404).json({ success: false, message: 'Replacement request not found' });
    }

    // Auth check
    if (returnRequest.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this replacement request' });
    }

    // Status check - only pending returns can be edited
    if (returnRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending replacement requests can be modified' });
    }

    const order = await Order.findById(returnRequest.order);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify order is online payment (not COD)
    if (order.paymentMethod === 'COD') {
      return res.status(400).json({ success: false, message: 'Replacements are only available for online orders' });
    }

    // Verify delivery is within 24 hours
    const deliveredStatus = order.tracking?.statusHistory?.find(
      (h) => h.status && h.status.toLowerCase() === 'delivered'
    );
    const deliveryTime = deliveredStatus ? new Date(deliveredStatus.timestamp) : new Date(order.updatedAt);
    const hoursSinceDelivery = (new Date() - deliveryTime) / (1000 * 60 * 60);

    if (hoursSinceDelivery > 24) {
      return res.status(400).json({ success: false, message: 'Replacement requests can only be modified/updated within 24 hours of delivery' });
    }

    // Verify returning items belong to order and quantities are valid
    if (items) {
      const returnItems = [];
      for (const item of items) {
        const orderItem = order.items.find(o => o.product.toString() === item.productId);
        if (!orderItem) {
          return res.status(400).json({ success: false, message: `Product ${item.name} not found in this order` });
        }
        if (item.quantity > orderItem.quantity) {
          return res.status(400).json({ success: false, message: `Replacement quantity exceeds ordered quantity for ${item.name}` });
        }

        returnItems.push({
          product: item.productId,
          name: orderItem.name,
          quantity: Number(item.quantity),
          price: orderItem.price,
          reason: item.reason || reason || returnRequest.reason
        });
      }
      returnRequest.items = returnItems;
    }

    if (reason) returnRequest.reason = reason;
    if (description) returnRequest.description = description;

    // Handle files if uploaded
    if (req.files) {
      if (req.files.photos && req.files.photos.length > 0) {
        returnRequest.photos = req.files.photos.map(file => file.path);
      }
      if (req.files.videos && req.files.videos.length > 0) {
        returnRequest.videos = req.files.videos.map(file => file.path);
      }
    }

    await returnRequest.save();

    // Send email to customer on edit/update
    try {
      const emailHtml = getReturnRequestedEmailTemplate(order, returnRequest, req.user.name);
      await sendEmail({
        to: req.user.email,
        subject: `Vardaan - Replacement Request Updated for Order #${order._id}`,
        html: emailHtml,
        text: `Hello ${req.user.name}, your replacement request for Order #${order._id} has been updated.`
      });
    } catch (emailErr) {
      console.error('Error sending replacement update email:', emailErr);
    }

    res.status(200).json({ success: true, message: 'Replacement request updated successfully', data: returnRequest });
  } catch (error) {
    next(error);
  }
};
