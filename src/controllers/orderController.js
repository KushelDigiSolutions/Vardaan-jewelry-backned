import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import InventoryLog from '../models/InventoryLog.js';
import Notification from '../models/Notification.js';
import Coupon from '../models/Coupon.js';
import { incrementCouponUsage } from './couponController.js';
import { sendEmail } from '../utils/email.js';
import { getInvoiceEmailTemplate, getStatusUpdateEmailTemplate, getOrderPlacedEmailTemplate } from '../utils/emailTemplates.js';
import { createDelhiveryOrder, trackDelhiveryShipment, cancelDelhiveryShipment } from '../utils/delhivery.js';
import { deductInventory, restoreInventory } from '../utils/inventoryHelper.js';

// Initialize Checkout / Create Pending Order from Cart
export const checkoutOrder = async (req, res, next) => {
  try {
    const { shippingAddress, shippingMethod = 'Standard Delivery', paymentMethod = 'Razorpay', couponCode } = req.body;

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty' });
    }

    // Verify stock availability and compute totals
    let totalAmount = 0;
    let taxableValue = 0;
    let itemsSubtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const prod = item.product;

      // If the product was deleted from DB, populate returns null — clean it from cart
      if (!prod) {
        cart.items = cart.items.filter(i => i.product !== null && i.product !== undefined);
        await cart.save();
        return res.status(400).json({ success: false, message: 'One or more products in your cart are no longer available. Please review your cart.' });
      }

      if (!prod.isActive) {
        return res.status(400).json({ success: false, message: `Product ${prod.name} is no longer available` });
      }

      // Stock limit validation — check correct inventory bucket
      let availableInventory = prod.inventory;

      if (item.variantDetails && item.variantDetails.colorOption && prod.colorImages && prod.colorImages.length > 0) {
        // Color variant match
        const colorMatch = prod.colorImages.find(c => c.color === item.variantDetails.colorOption);
        if (colorMatch && colorMatch.inventory !== undefined) {
          availableInventory = colorMatch.inventory;
        }
      } else if (item.variantDetails && prod.variants && prod.variants.length > 0) {
        // Full variant (karat + metalColor + size)
        const match = prod.variants.find(v =>
          v.size === item.variantDetails.size &&
          v.karat === item.variantDetails.karat &&
          v.metalColor === item.variantDetails.metalColor &&
          (v.metalType || '') === (item.variantDetails.metalType || '') &&
          (v.grossWeight || '') === (item.variantDetails.grossWeight || '') &&
          (v.netWeight || '') === (item.variantDetails.netWeight || '')
        );
        if (match) availableInventory = match.inventory;
      } else if (item.variant && prod.sizes && prod.sizes.length > 0) {
        // Size-only variant — check per-size inventory
        const sizeMatch = prod.sizes.find(s => s.size === item.variant);
        if (sizeMatch) availableInventory = sizeMatch.inventory;
      }

      if (availableInventory < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${prod.name} (${item.variant || 'default'})` });
      }

      const activePrice = (item.variantDetails?.salePrice > 0 ? item.variantDetails.salePrice : item.variantDetails?.price) || (prod.salePrice > 0 ? prod.salePrice : prod.price);
      
      // Calculate taxable price by extracting 3% GST (retaining 2 decimal points)
      const itemGst = Number((activePrice * 0.03).toFixed(2));
      const itemTaxablePrice = Number((activePrice - itemGst).toFixed(2));
      taxableValue += itemTaxablePrice * item.quantity;
      itemsSubtotal += activePrice * item.quantity;

      const orderItem = {
        product: prod._id,
        name: prod.name,
        price: activePrice,
        quantity: item.quantity,
        variant: item.variant
      };

      if (item.variantDetails && (
        item.variantDetails.size || 
        item.variantDetails.karat || 
        item.variantDetails.metalColor || 
        item.variantDetails.metalType || 
        item.variantDetails.grossWeight || 
        item.variantDetails.netWeight ||
        item.variantDetails.colorOption
      )) {
        orderItem.variantDetails = {
          size: item.variantDetails.size || undefined,
          karat: item.variantDetails.karat || undefined,
          metalColor: item.variantDetails.metalColor || undefined,
          metalType: item.variantDetails.metalType || undefined,
          grossWeight: item.variantDetails.grossWeight || undefined,
          netWeight: item.variantDetails.netWeight || undefined,
          price: item.variantDetails.price || undefined,
          salePrice: item.variantDetails.salePrice || undefined,
          colorOption: item.variantDetails.colorOption || undefined
        };
      }

      orderItems.push(orderItem);
    }

    // Apply coupon discount if provided on the taxable value
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (!coupon || !coupon.isValid(taxableValue, req.user._id)) {
        return res.status(400).json({ success: false, message: 'Coupon is invalid, expired, or has already been used' });
      }
      if (coupon.discountType === 'percentage') {
        discount = Number(((coupon.discountValue / 100) * taxableValue).toFixed(2));
      } else {
        discount = coupon.discountValue;
      }
      discount = Math.min(discount, taxableValue);
    }

    // Apply online discount or COD charge on taxable values
    let onlineDiscount = 0;
    let codCharge = 0;
    const amountBeforeShipping = Math.max(0, taxableValue - discount);
    
    if (paymentMethod === 'COD') {
      codCharge = 100;
    } else {
      onlineDiscount = Number((amountBeforeShipping * 0.05).toFixed(2));
    }

    // Configure shipping cost
    const amountAfterPaymentAdjustments = amountBeforeShipping + codCharge - onlineDiscount;
    let shippingCost = 0;
    if (shippingMethod === 'Express Delivery') {
      shippingCost = 150;
    } else if (amountAfterPaymentAdjustments <= 399) {
      shippingCost = 50; // Flat fee for low totals (below 399)
    }

    // Calculate subtotal, GST (original inclusive GST removed), and final total amount
    const subtotalForGst = Number((amountAfterPaymentAdjustments + shippingCost).toFixed(2));
    const gstAmount = Number((itemsSubtotal - taxableValue).toFixed(2));
    totalAmount = Number((subtotalForGst + gstAmount).toFixed(2));

    // Create Order in pending payment state
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      shippingMethod,
      shippingCost,
      paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      totalAmount,
      taxableValue,
      gstAmount,
      couponCode: couponCode ? couponCode.toUpperCase() : '',
      discount,
      codCharge,
      onlineDiscount,
      stockDeducted: false,
      tracking: {
        statusHistory: [{ status: 'pending', message: 'Awaiting checkout completion and payment verification' }]
      }
    });

    // ─── COD: deduct stock immediately and clear cart ───────────────────────
    // For Online payments: keep cart intact and DON'T deduct stock yet.
    // Stock for online orders is deducted only after payment is verified.
    if (paymentMethod === 'COD') {
      // Deduct inventory right away — COD is a confirmed purchase commitment
      try {
        await deductInventory(order.items, order._id);
        order.stockDeducted = true;
        await order.save();
      } catch (invErr) {
        console.error('Inventory deduction failed for COD order:', invErr);
      }

      // Clear cart immediately for COD (no payment gateway popup)
      cart.items = [];
      await cart.save();
    }
    // ────────────────────────────────────────────────────────────────────────

    // Increment coupon usage count after successful order creation
    if (couponCode) {
      await incrementCouponUsage(couponCode, req.user._id);
    }

    // Auto-register COD orders in Delhivery immediately
    if (paymentMethod === 'COD') {
      try {
        const populatedOrder = await Order.findById(order._id)
          .populate('user', 'name email mobile')
          .populate('items.product', 'sku');
        const delhiveryDetails = await createDelhiveryOrder(populatedOrder, req.user);
        order.tracking.awb = delhiveryDetails.waybill;
        order.tracking.carrier = 'Delhivery';
        order.tracking.statusHistory.push({
          status: 'pending',
          message: `Order registered in Delhivery. Waybill (AWB): ${delhiveryDetails.waybill}`
        });
        await order.save();
      } catch (delhiveryErr) {
        console.error('Auto Delhivery creation failed for COD order:', delhiveryErr);
      }
    }

    // Send Order Placement Email (Only for COD, Online orders send email after payment verification)
    if (paymentMethod === 'COD') {
      try {
        const orderForEmail = {
          ...order.toObject(),
          user: {
            name: req.user.name,
            email: req.user.email
          }
        };
        const emailHtml = getOrderPlacedEmailTemplate(orderForEmail);
        await sendEmail({
          to: req.user.email,
          subject: `Your Vardaan Order #${order._id} Has Been Placed!`,
          text: `Dear ${req.user.name},\n\nThank you for shopping with us! Your order #${order._id} has been successfully placed. We will notify you once your order is confirmed.\n\nTotal Amount: ₹${order.totalAmount}\n\nWarm regards,\nThe Vardaan Team`,
          html: emailHtml
        });
      } catch (emailError) {
        console.error('Failed to send order confirmation email:', emailError);
      }
    }

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// Get Orders (Admin sees all, Users see only theirs)
export const getOrders = async (req, res, next) => {
  try {
    let orders;
    if (req.user.role === 'admin') {
      orders = await Order.find().populate('user', 'name email').populate('items.product', 'images sku colorImages').sort({ createdAt: -1 });
    } else {
      orders = await Order.find({ user: req.user._id }).populate('items.product', 'images sku colorImages').sort({ createdAt: -1 });
    }
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

// Get Order Details
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'images sku colorImages');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Authorization check
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// Update Order Status (Admin)
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    let isModified = false;

    // 1. Handle Payment Status Update
    if (paymentStatus && order.paymentStatus !== paymentStatus) {
      order.paymentStatus = paymentStatus;
      isModified = true;

      // Record in statusHistory
      order.tracking.statusHistory.push({
        status: order.orderStatus,
        message: `Payment status updated to: ${paymentStatus.toUpperCase()}`
      });

      // User Notification
      await Notification.create({
        user: order.user._id,
        title: `Payment update: ${paymentStatus.toUpperCase()}`,
        message: `Payment status for order #${order._id} is now ${paymentStatus}.`
      });
    }

    // 2. Handle Order Status Update
    if (orderStatus && order.orderStatus !== orderStatus) {
      isModified = true;
      const previousStatus = order.orderStatus;
      order.orderStatus = orderStatus;

      // Record tracking update message
      let statusMessage = `Order status updated to ${orderStatus}`;

      if (orderStatus === 'confirmed') {
        statusMessage = 'Order payment confirmed. Preparing for package shipment.';

        // Only deduct inventory if not already done (prevents double-deduction for COD orders)
        if (!order.stockDeducted) {
          try {
            await deductInventory(order.items, order._id);
            order.stockDeducted = true;
          } catch (invErr) {
            console.error('Inventory deduction failed on admin confirm:', invErr);
          }
        }

      } else if (orderStatus === 'cancelled' && previousStatus !== 'cancelled') {
        statusMessage = 'Order has been cancelled.';

        // Restore inventory only if stock was previously deducted
        if (order.stockDeducted) {
          try {
            await restoreInventory(order.items, order._id);
            order.stockDeducted = false;
          } catch (invErr) {
            console.error('Inventory restore failed on admin cancel:', invErr);
          }
        }
      }

      order.tracking.statusHistory.push({
        status: orderStatus,
        message: statusMessage
      });

      // Trigger Notification & Email
      await Notification.create({
        user: order.user._id,
        title: `Order Status: ${orderStatus.toUpperCase()}`,
        message: `Your order #${order._id} is now ${orderStatus}.`
      });

      try {
        const emailHtml = orderStatus === 'confirmed'
          ? getInvoiceEmailTemplate(order)
          : getStatusUpdateEmailTemplate(order, `Order Status: ${orderStatus.toUpperCase()}`, statusMessage);

        await sendEmail({
          to: order.user.email,
          subject: orderStatus === 'confirmed'
            ? `Invoice for Order #${order._id} - Vardaan Jewel`
            : `Order #${order._id} Status Update: ${orderStatus.toUpperCase()}`,
          text: `Hello ${order.user.name},\n\nYour order #${order._id} status is now: ${orderStatus}.\nUpdate Details: ${statusMessage}\n\nThank you for shopping with us!`,
          html: emailHtml
        });
      } catch (err) {
        console.error("Email sending failed during order status update:", err);
      }
    }

    if (!isModified) {
      return res.status(400).json({ success: false, message: 'No updates provided or values already match current state' });
    }

    await order.save();
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// Ship Order / Create Shipment & AWB (Admin)
export const shipOrder = async (req, res, next) => {
  try {
    const { carrier = 'Delhivery' } = req.body;
    const order = await Order.findById(req.params.id).populate('user', 'name email mobile');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.orderStatus !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Only confirmed orders can be shipped' });
    }

    let finalCarrier = carrier;
    let awbNumber = '';

    if (carrier === 'Delhivery') {
      try {
        let awb = order.tracking.awb;
        if (!awb) {
          const populatedOrder = await Order.findById(order._id)
            .populate('user', 'name email mobile')
            .populate('items.product', 'sku');
          const delhiveryDetails = await createDelhiveryOrder(populatedOrder, order.user);
          awb = delhiveryDetails.waybill;
          order.tracking.awb = awb;
          order.tracking.carrier = 'Delhivery';
          order.tracking.statusHistory.push({
            status: 'shipped',
            message: `Order registered in Delhivery. Waybill (AWB): ${awb}`
          });
          await order.save();
        }
        awbNumber = awb;
      } catch (delhiveryError) {
        console.error('Delhivery API error:', delhiveryError);
        return res.status(400).json({
          success: false,
          message: `Delhivery Error: ${delhiveryError.message || delhiveryError}`
        });
      }
    } else {
      // Generate Mock Airway Bill (AWB) number for other carriers
      awbNumber = `AWB${Math.floor(10000000 + Math.random() * 90000000)}`;
    }

    order.orderStatus = 'shipped';
    order.tracking.carrier = finalCarrier;
    order.tracking.awb = awbNumber;
    order.tracking.statusHistory.push({
      status: 'shipped',
      message: `Shipment created via ${finalCarrier}. Airway Bill (AWB): ${awbNumber}`
    });

    await order.save();

    // Log Notification & Send Dispatch Mail
    await Notification.create({
      user: order.user._id,
      title: 'Order Dispatched',
      message: `Your order #${order._id} has been shipped via ${finalCarrier}. Tracking: ${awbNumber}`
    });

    try {
      await sendEmail({
        to: order.user.email,
        subject: `Order #${order._id} Dispatched! - Vardaan Jewel`,
        text: `Good news! Your order #${order._id} has been dispatched.\nCarrier: ${finalCarrier}\nAWB / Tracking Number: ${awbNumber}\n\nYou can track the package status from your dashboard.`,
        html: getStatusUpdateEmailTemplate(order, 'Order Dispatched & Shipped', `Your package has been successfully picked up by ${finalCarrier} and is in transit.`)
      });
    } catch (err) {
      console.error("Failed to send dispatch email:", err);
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// Helper to send status update emails & notifications
const handleStatusChangeEvents = async (order, oldStatus, newStatus) => {
  if (oldStatus === newStatus) return;

  // Make sure user object is populated
  if (!order.user || !order.user.email) {
    try {
      await order.populate('user', 'name email');
    } catch (popErr) {
      console.error('Failed to populate user for email notifications:', popErr);
      return;
    }
  }

  const carrier = order.tracking?.carrier || 'Delhivery';
  const awb = order.tracking?.awb || 'N/A';

  if (newStatus === 'shipped') {
    await Notification.create({
      user: order.user._id,
      title: 'Order Dispatched',
      message: `Your order #${order._id} has been shipped via ${carrier}. Tracking: ${awb}`
    });

    try {
      await sendEmail({
        to: order.user.email,
        subject: `Order #${order._id} Dispatched! - Vardaan Jewel`,
        text: `Good news! Your order #${order._id} has been dispatched.\nCarrier: ${carrier}\nAWB / Tracking Number: ${awb}\n\nYou can track the package status from your dashboard.`,
        html: getStatusUpdateEmailTemplate(order, 'Order Dispatched & Shipped', `Your package has been successfully picked up by ${carrier} and is in transit.`)
      });
    } catch (err) {
      console.error("Failed to send dispatch email on auto-sync:", err);
    }
  } else if (newStatus === 'delivered') {
    await Notification.create({
      user: order.user._id,
      title: `Order Status: DELIVERED`,
      message: `Your order #${order._id} is now delivered.`
    });

    try {
      const emailHtml = getStatusUpdateEmailTemplate(order, `Order Status: DELIVERED`, `Your package has been successfully delivered. Thank you for shopping with us!`);
      await sendEmail({
        to: order.user.email,
        subject: `Order #${order._id} Status Update: DELIVERED`,
        text: `Hello ${order.user.name},\n\nYour order #${order._id} status is now: delivered.\n\nThank you for shopping with us!`,
        html: emailHtml
      });
    } catch (err) {
      console.error("Email sending failed during order status update on auto-sync:", err);
    }
  } else if (newStatus === 'cancelled') {
    await Notification.create({
      user: order.user._id,
      title: 'Order Cancelled',
      message: `Your order #${order._id} has been cancelled.`
    });

    try {
      const emailHtml = getStatusUpdateEmailTemplate(order, 'Order Cancelled', 'Your order has been cancelled/returned.');
      await sendEmail({
        to: order.user.email,
        subject: `Order #${order._id} Cancelled - Vardaan Jewel`,
        text: `Hello ${order.user.name},\n\nYour order #${order._id} has been successfully cancelled.\n\nThank you for shopping with us!`,
        html: emailHtml
      });
    } catch (err) {
      console.error('Failed to send cancellation email on auto-sync:', err);
    }
  }
};

// Helper to sync tracking details from Delhivery
export const syncOrderTracking = async (order) => {
  if (!order.tracking.awb) {
    return order;
  }

  // Only sync if carrier is Delhivery
  if (order.tracking.carrier && !order.tracking.carrier.toLowerCase().includes('delhivery')) {
    return order;
  }

  try {
    const response = await trackDelhiveryShipment(order.tracking.awb);
    if (response && response.ShipmentData && response.ShipmentData.length > 0) {
      const shipData = response.ShipmentData[0].Shipment;
      if (shipData) {
        const latestStatus = shipData.Status?.Status?.toLowerCase() || '';
        const scans = shipData.Scans || [];

        // Update status history from scans
        if (scans.length > 0) {
          order.tracking.statusHistory = scans.map(s => {
            const scanDetail = s.ScanDetail;
            return {
              status: scanDetail.Scan?.toLowerCase() || 'pending',
              message: `${scanDetail.Instructions || scanDetail.Scan}${scanDetail.ScannedLocation ? ' - ' + scanDetail.ScannedLocation : ''}`,
              timestamp: scanDetail.ScanDateTime ? new Date(scanDetail.ScanDateTime) : new Date()
            };
          });
        }

        // Map status to internal orderStatus
        let calculatedStatus = order.orderStatus;
        let calculatedPaymentStatus = order.paymentStatus;
        let stockRestoreRequired = false;

        if (latestStatus.includes('delivered')) {
          calculatedStatus = 'delivered';
          calculatedPaymentStatus = 'paid';
        } else if (latestStatus.includes('cancel') || latestStatus.includes('return') || latestStatus.includes('rto')) {
          calculatedStatus = 'cancelled';
          if (order.stockDeductuated) {
            stockRestoreRequired = true;
          }
        } else if (latestStatus.includes('transit') || latestStatus.includes('dispatched') || latestStatus.includes('out for delivery') || latestStatus.includes('manifest') || latestStatus.includes('pending')) {
          calculatedStatus = 'shipped';
        }

        const oldStatus = order.orderStatus;
        order.orderStatus = calculatedStatus;
        order.paymentStatus = calculatedPaymentStatus;
        
        if (stockRestoreRequired) {
          try {
            await restoreInventory(order.items, order._id);
            order.stockDeducted = false;
          } catch (invErr) {
            console.error('Inventory restore failed during Delhivery track sync:', invErr);
          }
        }

        await order.save();

        // Trigger notifications and email
        if (oldStatus !== calculatedStatus) {
          await handleStatusChangeEvents(order, oldStatus, calculatedStatus);
        }
      }
    }
  } catch (err) {
    console.error(`Error in syncOrderTracking for order #${order._id}:`, err);
  }
  return order;
};

// Fetch Tracking updates
export const trackOrder = async (req, res, next) => {
  try {
    let order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Sync tracking dynamically if it has an AWB and carrier is Delhivery
    if (order.tracking && order.tracking.awb && order.tracking.carrier && order.tracking.carrier.toLowerCase().includes('delhivery')) {
      order = await syncOrderTracking(order);
    }

    res.status(200).json({ success: true, data: order.tracking });
  } catch (error) {
    next(error);
  }
};

// Handle Delhivery webhook tracking updates
export const delhiveryWebhook = async (req, res, next) => {
  try {
    const payload = req.body;
    console.log('Received Delhivery Webhook:', JSON.stringify(payload, null, 2));

    // Optional validation with a token
    const webhookToken = process.env.DELHIVERY_WEBHOOK_TOKEN;
    if (webhookToken) {
      const receivedToken = req.headers['x-api-key'] || req.headers['authorization'];
      if (receivedToken && receivedToken !== webhookToken && receivedToken !== `Bearer ${webhookToken}`) {
        console.warn('Unauthorized Delhivery Webhook attempt.');
        return res.status(401).json({ success: false, message: 'Unauthorized webhook request' });
      }
    }

    // Extract list of updates from payload (support arrays, ShipmentData, or single objects)
    let rawUpdates = [];
    if (Array.isArray(payload)) {
      rawUpdates = payload;
    } else if (payload && Array.isArray(payload.ShipmentData)) {
      rawUpdates = payload.ShipmentData;
    } else if (payload && typeof payload === 'object') {
      rawUpdates = [payload];
    }

    for (const item of rawUpdates) {
      // Robust field extraction across Delhivery API payload versions
      const awb = item.awb || item.waybill || item.Waybill || item.AWB || 
                  item.Shipment?.AWB || item.Shipment?.Waybill || 
                  item.ShipmentData?.[0]?.Shipment?.AWB || item.ShipmentData?.[0]?.Shipment?.Waybill || item.refnum;

      if (!awb) continue;

      const rawStatus = item.status || 
                        (typeof item.Status === 'string' ? item.Status : item.Status?.Status) || 
                        item.Shipment?.Status?.Status || 
                        item.Shipment?.Status || '';

      const location = item.location || item.ScannedLocation || item.location_name || 
                       item.Shipment?.ScannedLocation || item.Shipment?.location || '';

      const remarks = item.remarks || item.Instructions || item.Status?.Instructions || 
                      item.Shipment?.Status?.Instructions || item.Shipment?.remarks || rawStatus || '';

      const order = await Order.findOne({ 'tracking.awb': awb.toString() }).populate('user', 'name email');
      if (!order) {
        console.warn(`Delhivery Webhook: Order not found for AWB: ${awb}`);
        continue;
      }

      const statusLower = String(rawStatus).toLowerCase();
      
      // Update tracking status history timeline
      const statusMsg = `${remarks}${location ? ' - ' + location : ''}`.trim() || rawStatus || 'Status update received';
      const lastHistory = order.tracking.statusHistory[order.tracking.statusHistory.length - 1];
      if (!lastHistory || lastHistory.message !== statusMsg || lastHistory.status !== statusLower) {
        order.tracking.statusHistory.push({
          status: statusLower || 'pending',
          message: statusMsg,
          timestamp: new Date()
        });
      }

      // Map status to internal orderStatus enum ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')
      let calculatedStatus = order.orderStatus;
      let calculatedPaymentStatus = order.paymentStatus;
      let stockRestoreRequired = false;

      if (statusLower.includes('delivered')) {
        calculatedStatus = 'delivered';
        calculatedPaymentStatus = 'paid'; // Mark payment paid upon successful delivery
      } else if (statusLower.includes('cancel') || statusLower.includes('return') || statusLower.includes('rto') || statusLower.includes('dto')) {
        calculatedStatus = 'cancelled';
        if (order.stockDeducted) {
          stockRestoreRequired = true;
        }
      } else if (
        statusLower.includes('transit') || 
        statusLower.includes('dispatched') || 
        statusLower.includes('out for delivery') || 
        statusLower.includes('manifest') || 
        statusLower.includes('picked up') ||
        statusLower.includes('in-transit')
      ) {
        calculatedStatus = 'shipped';
      }

      const oldStatus = order.orderStatus;
      order.orderStatus = calculatedStatus;
      order.paymentStatus = calculatedPaymentStatus;

      // Restore inventory if shipment was cancelled / RTO after stock was deducted
      if (stockRestoreRequired) {
        try {
          await restoreInventory(order.items, order._id);
          order.stockDeducted = false;
        } catch (invErr) {
          console.error('Inventory restore failed during Delhivery webhook update:', invErr);
        }
      }

      await order.save();
      console.log(`Order #${order._id} updated via Delhivery Webhook to: ${order.orderStatus}`);

      // Trigger notifications and email if orderStatus changed or if "out for delivery" status milestone hit
      if (oldStatus !== calculatedStatus) {
        await handleStatusChangeEvents(order, oldStatus, calculatedStatus);
      } else if (statusLower.includes('out for delivery')) {
        // Send extra notification & email for "Out for Delivery" milestone
        try {
          await Notification.create({
            user: order.user._id,
            title: 'Order Out for Delivery',
            message: `Your order #${order._id} is out for delivery today!`
          });

          await sendEmail({
            to: order.user.email,
            subject: `Order #${order._id} is Out for Delivery! - Vardaan Jewel`,
            text: `Hello ${order.user.name},\n\nGreat news! Your order #${order._id} is out for delivery today and will reach you shortly.\n\nCarrier: ${order.tracking.carrier || 'Delhivery'}\nAWB: ${awb}`,
            html: getStatusUpdateEmailTemplate(order, 'Out for Delivery Today!', `Your package is out for delivery with our courier agent and will reach your shipping address today.`)
          });
        } catch (ofdEmailErr) {
          console.error('Failed to send Out for Delivery email:', ofdEmailErr);
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Delhivery Webhook processed successfully' });
  } catch (error) {
    console.error('Error handling Delhivery Webhook:', error);
    return res.status(200).json({ success: false, error: error.message });
  }
};

// Cancel Order (User)

export const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Authorization check
    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this order' });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order is already cancelled' });
    }

    if (['shipped', 'delivered'].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: `Cannot cancel order after it has been ${order.orderStatus}` });
    }

    order.orderStatus = 'cancelled';

    // Call Delhivery cancel if waybill exists
    if (order.tracking && order.tracking.awb && order.tracking.carrier === 'Delhivery') {
      try {
        await cancelDelhiveryShipment(order.tracking.awb);
        order.tracking.statusHistory.push({
          status: 'cancelled',
          message: 'Delhivery shipment cancelled.'
        });
      } catch (delhiveryCancelErr) {
        console.error('Failed to cancel Delhivery shipment:', delhiveryCancelErr);
      }
    }

    // Restore stock only if it was previously deducted (handles COD + confirmed online orders)
    // Uses shared helper that correctly handles variants[], sizes[], and root inventory
    if (order.stockDeducted) {
      try {
        await restoreInventory(order.items, order._id);
        order.stockDeducted = false;
      } catch (invErr) {
        console.error('Inventory restore failed on user cancel:', invErr);
      }
    }

    order.tracking.statusHistory.push({
      status: 'cancelled',
      message: 'Order cancelled by customer.'
    });

    await order.save();

    // Trigger Notification for User
    await Notification.create({
      user: order.user._id,
      title: 'Order Cancelled',
      message: `Your order #${order._id} has been cancelled.`
    });

    // Send email notification to user
    try {
      const emailHtml = getStatusUpdateEmailTemplate(order, 'Order Cancelled', 'Your order has been successfully cancelled by customer.');
      await sendEmail({
        to: order.user.email,
        subject: `Order #${order._id} Cancelled - Vardaan Jewel`,
        text: `Hello ${order.user.name},\n\nYour order #${order._id} has been successfully cancelled.\n\nThank you for shopping with us!`,
        html: emailHtml
      });
    } catch (err) {
      console.error('Failed to send cancellation email:', err);
    }

    res.status(200).json({ success: true, message: 'Order cancelled successfully', data: order });
  } catch (error) {
    next(error);
  }
};
