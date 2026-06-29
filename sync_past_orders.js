import 'dotenv/config';
import connectDB from './src/config/db.js';
import User from './src/models/User.js';
import Product from './src/models/Product.js';
import Order from './src/models/Order.js';
import { createShiprocketOrder } from './src/utils/shiprocket.js';

const syncOrders = async () => {
  try {
    console.log('Connecting to MongoDB via project db config...');
    await connectDB();
    console.log('Waiting for connection to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Find all confirmed or pending orders that do not have shiprocketShipmentId yet
    const orders = await Order.find({
      $or: [
        { shiprocketShipmentId: { $exists: false } },
        { shiprocketShipmentId: '' },
        { shiprocketShipmentId: null }
      ]
    }).populate('user');

    console.log(`Found ${orders.length} orders that need to be synced to Shiprocket.`);

    let successCount = 0;
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      console.log(`\nProcessing Order #${order._id} (${i + 1}/${orders.length})...`);
      
      if (order.orderStatus === 'cancelled') {
        console.log(`Order #${order._id} is cancelled. Skipping.`);
        continue;
      }

      try {
        const populatedOrder = await Order.findById(order._id)
          .populate('user')
          .populate('items.product', 'sku');

        console.log(`Pushing Order #${order._id} to Shiprocket...`);
        const srDetails = await createShiprocketOrder(populatedOrder, order.user);
        
        order.shiprocketOrderId = srDetails.shiprocketOrderId;
        order.shiprocketShipmentId = srDetails.shipmentId;
        order.tracking.statusHistory.push({
          status: order.orderStatus,
          message: `Order registered in Shiprocket during past orders sync. Shipment ID: ${srDetails.shipmentId}`
        });

        await order.save();
        console.log(`✅ Order #${order._id} synced successfully! Shipment ID: ${srDetails.shipmentId}`);
        successCount++;
      } catch (err) {
        console.error(`❌ Failed to sync Order #${order._id}:`, err.message || err);
      }
    }

    console.log(`\nSync process completed. Synced ${successCount} orders.`);
  } catch (err) {
    console.error('Database/Sync error:', err);
  } finally {
    process.exit(0);
  }
};

syncOrders();
