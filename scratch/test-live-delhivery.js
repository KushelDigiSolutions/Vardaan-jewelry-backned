// Use global fetch
const token = '2d8f377d9039d35cd92d34c6f4e7010673ac8791';
const resolvedPickupLocation = 'Vardaan Jewels';
const apiBaseUrl = 'https://track.delhivery.com';

const baseShipment = {
  name: 'Test Customer',
  add: 'Patel Nagar 2',
  pin: '201001',
  phone: '9999999999',
  payment_mode: 'Prepaid',
  order: 'TEST_' + Math.floor(Math.random() * 1000000),
  products_desc: 'Test Ring',
  weight: 200,
  quantity: 1
};

async function testCombination(clientValue, omitClient = false) {
  const shipments = [{ ...baseShipment }];
  if (!omitClient) {
    shipments[0].client = clientValue;
  }

  // pickup_location is an object here
  const payload = {
    pickup_location: {
      name: resolvedPickupLocation
    },
    shipments: shipments
  };

  const bodyString = `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;

  console.log(`\nTesting with pickup_location object & client: "${omitClient ? 'OMITTED' : clientValue}"...`);
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

    // If successfully created, cancel it immediately so there is no charge
    if (data.success && data.packages && data.packages.length > 0 && data.packages[0].status === 'Success') {
      const waybill = data.packages[0].waybill;
      console.log(`SUCCESS! Booked waybill: ${waybill}. Cancelling immediately...`);
      const cancelRes = await fetch(`${apiBaseUrl}/api/p/edit/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ waybill, cancellation: true })
      });
      const cancelData = await cancelRes.json();
      console.log('Cancellation Response:', cancelData);
    }
  } catch (err) {
    console.error('Error during test:', err);
  }
}

async function runAllTests() {
  // Test 1: pickup_location as object, client omitted
  await testCombination('', true);

  // Test 2: pickup_location as object, client = "UCP Business"
  await testCombination('UCP Business');

  // Test 3: pickup_location as object, client = "Vikas Jindal"
  await testCombination('Vikas Jindal');
}

runAllTests();
