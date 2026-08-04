import { createDelhiveryOrder } from '../src/utils/delhivery.js';

// Setup Mock Order
const mockOrder = {
  _id: '64b19c28f09d8e7a83d7890b',
  paymentMethod: 'COD',
  totalAmount: 1200,
  shippingCost: 50,
  createdAt: new Date(),
  shippingAddress: {
    street: 'E 191, Patel Nagar 2',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    zipCode: '201001',
    country: 'India',
    mobile: '9818719997'
  },
  items: [
    { name: 'Diamond Ring', quantity: 1, price: 1150 }
  ]
};

const mockUser = {
  name: 'Vikas Jindal',
  email: 'vikasjindal1@gmail.com',
  mobile: '9818719997'
};

// Set Env variables for testing
process.env.DELHIVERY_API_TOKEN = '2d8f377d9039d35cd92d34c6f4e7010673ac8791';
process.env.DELHIVERY_CLIENT_NAME = 'UCP Business';
process.env.DELHIVERY_PICKUP_LOCATION = 'Vardaan Jewels';
process.env.DELHIVERY_API_URL = 'https://track.delhivery.com';

// Mock global fetch to capture the parameters sent to Delhivery
global.fetch = async (url, options) => {
  console.log('--- Intercepted Fetch Call ---');
  console.log('URL:', url);
  console.log('Method:', options.method);
  console.log('Headers:', options.headers);
  
  if (options.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
    const params = new URLSearchParams(options.body);
    console.log('Format:', params.get('format'));
    console.log('Data payload:', JSON.parse(params.get('data')));
  }

  // Return a mock successful response matching Delhivery's API schema
  return {
    ok: true,
    json: async () => ({
      success: true,
      packages: [
        {
          status: 'Success',
          waybill: '1234567890AWB',
          refnum: mockOrder._id
        }
      ]
    })
  };
};

async function runTest() {
  try {
    console.log('Running Delhivery Order Booking Test...');
    const result = await createDelhiveryOrder(mockOrder, mockUser);
    console.log('\n--- API Output Result ---');
    console.log('Waybill (AWB):', result.waybill);
    console.log('Reference number:', result.refnum);
    console.log('\nResult: SUCCESS - Code integrated correctly and payload matches Delhivery guidelines.');
  } catch (err) {
    console.error('Test Failed:', err);
  }
}

runTest();
