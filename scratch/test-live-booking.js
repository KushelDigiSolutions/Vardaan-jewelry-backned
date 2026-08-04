// Use global fetch
const token = '2d8f377d9039d35cd92d34c6f4e7010673ac8791';
const resolvedPickupLocation = 'Vardaan Jewels';
const apiBaseUrl = 'https://track.delhivery.com';

const realShipment = {
  name: 'Karan Kartik',
  add: 'navyug market c-2, ghaziabad',
  pin: '201001',
  phone: '8707592647',
  payment_mode: 'COD',
  client: 'ea8de5-UCPBusiness-do', // Resolved client ID
  cod_amount: 835,
  order: 'TEST_REAL_' + Math.floor(Math.random() * 1000000),
  products_desc: 'Aurora Wave Cuff Bracelet (Qty: 1)',
  weight: 200,
  quantity: 1
};

async function runRealBookingTest() {
  const payload = {
    pickup_location: {
      name: resolvedPickupLocation
    },
    shipments: [realShipment]
  };

  const bodyString = `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;

  console.log('Sending real booking request to Delhivery...');
  try {
    const response = await fetch(`${apiBaseUrl}/api/cmu/create.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Token ${token}`
      },
      body: bodyString
    });

    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(data, null, 2));

    if (data.packages && data.packages.length > 0) {
      const pkg = data.packages[0];
      if (pkg.status === 'Success') {
        const waybill = pkg.waybill;
        console.log(`\nSUCCESS! Created waybill: ${waybill}. Cancelling immediately to avoid billing...`);
        const cancelRes = await fetch(`${apiBaseUrl}/api/p/edit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`
          },
          body: JSON.stringify({ waybill, cancellation: true })
        });
        const cancelText = await cancelRes.text();
        console.log('Cancellation Response Text:', cancelText);
      } else {
        console.log('Package booking failed with remarks:', pkg.remarks);
      }
    } else {
      console.log('No package returned in response.');
    }
  } catch (err) {
    console.error('Error in live booking test:', err);
  }
}

runRealBookingTest();
