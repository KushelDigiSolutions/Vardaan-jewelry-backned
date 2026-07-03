import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import InventoryLog from '../models/InventoryLog.js';
import Notification from '../models/Notification.js';
import Coupon from '../models/Coupon.js';
import { incrementCouponUsage } from './couponController.js';
import { sendEmail } from '../utils/email.js';
import { getInvoiceEmailTemplate, getStatusUpdateEmailTemplate, getOrderPlacedEmailTemplate } from '../utils/emailTemplates.js';
import { createShiprocketOrder, generateAWB } from '../utils/shiprocket.js';

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
    const orderItems = [];

    for (const item of cart.items) {
      const prod = item.product;
      if (!prod.isActive) {
        return res.status(400).json({ success: false, message: `Product ${prod.name} is no longer available` });
      }

      // Stock limit validation based on variant
      let availableInventory = prod.inventory;
      if (item.variantDetails && prod.variants && prod.variants.length > 0) {
        const match = prod.variants.find(v => 
          v.size === item.variantDetails.size &&
          v.karat === item.variantDetails.karat &&
          v.metalColor === item.variantDetails.metalColor &&
          (v.metalType || '') === (item.variantDetails.metalType || '') &&
          (v.grossWeight || '') === (item.variantDetails.grossWeight || '') &&
          (v.netWeight || '') === (item.variantDetails.netWeight || '')
        );
        if (match) {
          availableInventory = match.inventory;
        }
      }

      if (availableInventory < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${prod.name} (${item.variant || 'default'})` });
      }

      const activePrice = item.variantDetails?.price || (prod.salePrice > 0 ? prod.salePrice : prod.price);
      totalAmount += activePrice * item.quantity;

      const orderItem = {
        product: prod._id,
        name: prod.name,
        price: activePrice,
        quantity: item.quantity,
        variant: item.variant
      };

      if (item.variantDetails && (item.variantDetails.size || item.variantDetails.karat || item.variantDetails.metalColor || item.variantDetails.metalType || item.variantDetails.grossWeight || item.variantDetails.netWeight)) {
        orderItem.variantDetails = {
          size: item.variantDetails.size || undefined,
          karat: item.variantDetails.karat || undefined,
          metalColor: item.variantDetails.metalColor || undefined,
          metalType: item.variantDetails.metalType || undefined,
          grossWeight: item.variantDetails.grossWeight || undefined,
          netWeight: item.variantDetails.netWeight || undefined,
          price: item.variantDetails.price || undefined,
          salePrice: item.variantDetails.salePrice || undefined
        };
      }

      orderItems.push(orderItem);
    }

    // Apply coupon discount if provided
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (!coupon || !coupon.isValid(totalAmount, req.user._id)) {
        return res.status(400).json({ success: false, message: 'Coupon is invalid, expired, or has already been used' });
      }
      if (coupon.discountType === 'percentage') {
        discount = (coupon.discountValue / 100) * totalAmount;
      } else {
        discount = coupon.discountValue;
      }
      discount = Math.min(discount, totalAmount);
      totalAmount = Math.max(0, totalAmount - discount);
    }

    // Configure shipping cost
    let shippingCost = 0;
    if (shippingMethod === 'Express Delivery') {
      shippingCost = 150;
    } else if (totalAmount < 999) {
      shippingCost = 50; // Flat fee for low totals
    }
    totalAmount += shippingCost;

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
      tracking: {
        statusHistory: [{ status: 'pending', message: 'Awaiting checkout completion and payment verification' }]
      }
    });

    // Clear user cart
    cart.items = [];
    await cart.save();

    // Increment coupon usage count after successful order creation
    if (couponCode) {
      await incrementCouponUsage(couponCode, req.user._id);
    }

    // Auto-register COD orders in Shiprocket immediately
    if (paymentMethod === 'COD') {
      try {
        const populatedOrder = await Order.findById(order._id)
          .populate('user', 'name email mobile')
          .populate('items.product', 'sku');
        const srDetails = await createShiprocketOrder(populatedOrder, req.user);
        order.shiprocketOrderId = srDetails.shiprocketOrderId;
        order.shiprocketShipmentId = srDetails.shipmentId;
        order.tracking.statusHistory.push({
          status: 'pending',
          message: `Order registered in Shiprocket. Shipment ID: ${srDetails.shipmentId}`
        });
        await order.save();
      } catch (srErr) {
        console.error('Auto Shiprocket creation failed for COD order:', srErr);
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
      orders = await Order.find().populate('user', 'name email').populate('items.product', 'images sku').sort({ createdAt: -1 });
    } else {
      orders = await Order.find({ user: req.user._id }).populate('items.product', 'images sku').sort({ createdAt: -1 });
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
      .populate('items.product', 'images sku');

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
    const { orderStatus } = req.body;
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.orderStatus === orderStatus) {
      return res.status(400).json({ success: false, message: 'Order is already in this state' });
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = orderStatus;

    // Record tracking update message
    let statusMessage = `Order status updated to ${orderStatus}`;
    if (orderStatus === 'confirmed') {
      statusMessage = 'Order payment confirmed. Preparing for package shipment.';
      
      // DECREMENT inventory on confirmation (if not already done)
      for (const item of order.items) {
        const prod = await Product.findById(item.product);
        if (prod) {
          prod.inventory = Math.max(0, prod.inventory - item.quantity);
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
          await prod.save();

          await InventoryLog.create({
            product: prod._id,
            change: -item.quantity,
            type: 'sale',
            notes: `Stock subtracted for Order #${order._id}`
          });

          // Check for Low Stock warnings
          if (prod.inventory <= 10) {
            await Notification.create({
              title: 'Low Stock Alert',
              message: `Product "${prod.name}" (SKU: ${prod.sku}) has only ${prod.inventory} units remaining!`,
            });
          }
        }
      }
    } else if (orderStatus === 'cancelled' && previousStatus !== 'cancelled') {
      statusMessage = 'Order has been cancelled.';
      
      // RESTORE inventory if order was already confirmed/shipped
      if (previousStatus === 'confirmed' || previousStatus === 'shipped') {
        for (const item of order.items) {
          const prod = await Product.findById(item.product);
          if (prod) {
            prod.inventory += item.quantity;
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
                prod.variants[vIndex].inventory += item.quantity;
              }
            }
            await prod.save();

            await InventoryLog.create({
              product: prod._id,
              change: item.quantity,
              type: 'return',
              notes: `Stock returned from cancelled Order #${order._id}`
            });
          }
        }
      }
    }

    order.tracking.statusHistory.push({
      status: orderStatus,
      message: statusMessage
    });

    await order.save();

    // Trigger Notification & Email
    await Notification.create({
      user: order.user._id,
      title: `Order Status: ${orderStatus.toUpperCase()}`,
      message: `Your order #${order._id} is now ${orderStatus}.`
    });

    const emailHtml = orderStatus === 'confirmed' 
      ? getInvoiceEmailTemplate(order)
      : getStatusUpdateEmailTemplate(order, `Order Status: ${orderStatus.toUpperCase()}`, statusMessage);

    await sendEmail({
      to: order.user.email,
      subject: orderStatus === 'confirmed' 
        ? `Invoice for Order #${order._id} - Vardaan Store` 
        : `Order #${order._id} Status Update: ${orderStatus.toUpperCase()}`,
      text: `Hello ${order.user.name},\n\nYour order #${order._id} status is now: ${orderStatus}.\nUpdate Details: ${statusMessage}\n\nThank you for shopping with us!`,
      html: emailHtml
    });

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

    if (carrier === 'Shiprocket') {
      try {
        let shipmentId = order.shiprocketShipmentId;
        if (!shipmentId) {
          const populatedOrder = await Order.findById(order._id)
            .populate('user', 'name email mobile')
            .populate('items.product', 'sku');
          const srDetails = await createShiprocketOrder(populatedOrder, order.user);
          shipmentId = srDetails.shipmentId;
          order.shiprocketOrderId = srDetails.shiprocketOrderId;
          order.shiprocketShipmentId = srDetails.shipmentId;
        }

        const awbResult = await generateAWB(shipmentId);
        awbNumber = awbResult.awb;
        finalCarrier = awbResult.courier;
      } catch (shiprocketError) {
        console.error('Shiprocket API error:', shiprocketError);
        return res.status(400).json({
          success: false,
          message: `Shiprocket Error: ${shiprocketError.message || shiprocketError}`
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
        subject: `Order #${order._id} Dispatched! - Vardaan Store`,
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

// Fetch Tracking updates
export const trackOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.status(200).json({ success: true, data: order.tracking });
  } catch (error) {
    next(error);
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

    const previousStatus = order.orderStatus;
    order.orderStatus = 'cancelled';
    
    // Restore stock if previously confirmed
    if (previousStatus === 'confirmed') {
      for (const item of order.items) {
        const prod = await Product.findById(item.product);
        if (prod) {
          prod.inventory += item.quantity;
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
              prod.variants[vIndex].inventory += item.quantity;
            }
          }
          await prod.save();

          await InventoryLog.create({
            product: prod._id,
            change: item.quantity,
            type: 'return',
            notes: `Stock returned from customer-cancelled Order #${order._id}`
          });
        }
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
        subject: `Order #${order._id} Cancelled - Vardaan Store`,
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
