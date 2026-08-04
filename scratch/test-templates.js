import { getInvoiceEmailTemplate, getOrderPlacedEmailTemplate } from '../src/utils/emailTemplates.js';

// Mock Order 1: Intra-state (Uttar Pradesh), Paid, Coupon Discount, codCharge
const orderUP = {
  _id: 'ORDER12345UP',
  paymentMethod: 'COD',
  paymentStatus: 'pending',
  createdAt: new Date(),
  user: {
    name: 'Ramesh Singh',
    email: 'ramesh@example.com'
  },
  shippingAddress: {
    street: '123, Gomti Nagar',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    zipCode: '226010',
    country: 'India'
  },
  items: [
    { name: 'Gold Ring', quantity: 1, price: 1000 }
  ],
  codCharge: 100,
  onlineDiscount: 0,
  discount: 50,
  shippingCost: 50,
  taxableValue: 970.00, // Number((1000 * 0.97).toFixed(2))
  gstAmount: 30.00, // 1000 - 970
  totalAmount: 1100.00 // 1070 + 30
};

// Mock Order 2: Inter-state (Maharashtra), Paid, Online Discount
const orderMH = {
  _id: 'ORDER12345MH',
  paymentMethod: 'Razorpay',
  paymentStatus: 'paid',
  createdAt: new Date(),
  user: {
    name: 'Suresh Patil',
    email: 'suresh@example.com'
  },
  shippingAddress: {
    street: '456, Marine Drive',
    city: 'Mumbai',
    state: 'Maharashtra',
    zipCode: '400020',
    country: 'India'
  },
  items: [
    { name: 'Silver Necklace', quantity: 2, price: 500 }
  ],
  codCharge: 0,
  onlineDiscount: 48.50, // Number((970 * 0.05).toFixed(2))
  discount: 0,
  shippingCost: 50,
  taxableValue: 970.00, // 2 * Number((500 * 0.97).toFixed(2))
  gstAmount: 30.00, // 1000 - 970
  totalAmount: 1001.50 // 971.5 + 30
};

console.log('--- Testing UP (Intra-state) Invoice ---');
const htmlUP = getInvoiceEmailTemplate(orderUP);

// Regex check for payment status
console.log('Payment Status shows PENDING?', htmlUP.includes('PENDING') && !htmlUP.includes('PAID') ? 'PASS' : 'FAIL');
console.log('Welcome msg includes pending order text?', htmlUP.includes('Your order has been confirmed.') ? 'PASS' : 'FAIL');
console.log('Includes CGST (1.5%)?', htmlUP.includes('CGST (1.5%)') ? 'PASS' : 'FAIL');
console.log('Includes SGST (1.5%)?', htmlUP.includes('SGST (1.5%)') ? 'PASS' : 'FAIL');
console.log('Includes HSN 7117?', htmlUP.includes('7117') ? 'PASS' : 'FAIL');
console.log('Includes Coupon Discount row?', htmlUP.includes('Coupon Discount') ? 'PASS' : 'FAIL');

// Calculate expected math:
// Total UP totalAmount = 1100.00
// Taxable UP = 970.00
// Total GST = 30.00
// CGST = 15.00, SGST = 15.00
console.log('Taxable value matches ₹970.00?', htmlUP.includes('₹970.00') ? 'PASS' : 'FAIL');
console.log('CGST matches ₹15.00?', htmlUP.includes('₹15.00') ? 'PASS' : 'FAIL');
console.log('SGST matches ₹15.00?', htmlUP.includes('₹15.00') ? 'PASS' : 'FAIL');

console.log('\n--- Testing Maharashtra (Inter-state) Invoice ---');
const htmlMH = getInvoiceEmailTemplate(orderMH);

console.log('Payment Status shows PAID?', htmlMH.includes('PAID') && !htmlMH.includes('PENDING') ? 'PASS' : 'FAIL');
console.log('Welcome msg includes paid success text?', htmlMH.includes('We have successfully received the payment for your order.') ? 'PASS' : 'FAIL');
console.log('Includes IGST (3%)?', htmlMH.includes('IGST (3%)') ? 'PASS' : 'FAIL');
console.log('Includes HSN 7117?', htmlMH.includes('7117') ? 'PASS' : 'FAIL');

// Calculate expected math:
// Total MH totalAmount = 1001.50
// Taxable MH = 970.00
// Total GST = 30.00
// IGST = 30.00
console.log('Taxable value matches ₹970.00?', htmlMH.includes('₹970.00') ? 'PASS' : 'FAIL');
console.log('IGST matches ₹30.00?', htmlMH.includes('₹30.00') ? 'PASS' : 'FAIL');

console.log('\n--- Testing Order Placed Template ---');
const htmlPlaced = getOrderPlacedEmailTemplate(orderUP);
console.log('Order Placed includes HSN?', htmlPlaced.includes('7117') ? 'PASS' : 'FAIL');
console.log('Order Placed includes CGST (1.5%)?', htmlPlaced.includes('CGST (1.5%)') ? 'PASS' : 'FAIL');
console.log('Order Placed includes Coupon Discount?', htmlPlaced.includes('Coupon Discount') ? 'PASS' : 'FAIL');
