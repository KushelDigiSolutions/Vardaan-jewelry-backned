import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../src/models/Order.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb+srv://karankusheldigisolution_db_user:bh4IWCL9i6abHWJH@vardaan.thie8gx.mongodb.net/vardaan-ecom';

async function checkOrders() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected! Fetching the 3 most recent orders...');

    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('user', 'name email');

    if (orders.length === 0) {
      console.log('No orders found in the database.');
      return;
    }

    orders.forEach((order, index) => {
      console.log(`\n--- Order ${index + 1} ---`);
      console.log('Order ID:', order._id);
      console.log('User Name/Email:', order.user?.name, '/', order.user?.email);
      console.log('Payment Method:', order.paymentMethod);
      console.log('Payment Status:', order.paymentStatus);
      console.log('Order Status:', order.orderStatus);
      console.log('Total Amount:', order.totalAmount);
      console.log('Carrier:', order.tracking?.carrier);
      console.log('AWB:', order.tracking?.awb);
      console.log('Status History:', JSON.stringify(order.tracking?.statusHistory, null, 2));
    });

  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

checkOrders();
