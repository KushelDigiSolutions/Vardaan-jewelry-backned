/**
 * Delhivery Logistics Integration Utility
 * Production-ready service utilizing native fetch.
 */

/**
 * Registers a shipment order in Delhivery.
 * Delhivery returns the waybill (AWB) number upon successful creation.
 * @param {Object} order Mongoose order document
 * @param {Object} user User profile document
 * @returns {Promise<Object>} Shipment details containing waybill / AWB
 */
export const createDelhiveryOrder = async (order, user) => {
  const token = process.env.DELHIVERY_API_TOKEN;
  const clientName = process.env.DELHIVERY_CLIENT_NAME || 'UCP Business';
  const resolvedPickupLocation = process.env.DELHIVERY_PICKUP_LOCATION || 'Vardaan Jewels';
  const apiBaseUrl = process.env.DELHIVERY_API_URL || 'https://track.delhivery.com';

  if (!token) {
    throw new Error('Delhivery API Token is not defined in environmental variables.');
  }

  // Format delivery customer details
  const fullName = user?.name || 'Customer';
  const streetAddress = `${order.shippingAddress.street}, ${order.shippingAddress.city}`;
  
  // Phone & Pincode Sanitization (Must be 10 digits and 6 digits respectively)
  let phone = (order.shippingAddress.mobile || user?.mobile || '9999999999').replace(/[^0-9]/g, '');
  if (phone.length < 10) {
    phone = '9999999999';
  } else {
    phone = phone.slice(-10);
  }
  const pincode = order.shippingAddress.zipCode.replace(/[^0-9]/g, '').slice(0, 6) || '110001';

  // Description of products
  const productsDesc = order.items.map(item => `${item.name} (Qty: ${item.quantity})`).join(', ').substring(0, 80);

  // Delhivery API payload format (form-encoded format=json&data=...)
  const payload = {
    pickup_location: {
      name: resolvedPickupLocation
    },
    shipments: [
      {
        name: fullName,
        add: streetAddress,
        pin: pincode,
        phone: phone,
        payment_mode: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
        client: clientName,
        cod_amount: order.paymentMethod === 'COD' ? order.totalAmount : 0,
        order: order._id.toString(),
        products_desc: productsDesc || 'Jewelry Items',
        weight: 200, // Default 200 grams
        quantity: order.items.reduce((sum, item) => sum + item.quantity, 0) || 1
      }
    ]
  };

  // Convert payload to standard Delhivery application/x-www-form-urlencoded body string
  const bodyString = `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;

  const response = await fetch(`${apiBaseUrl}/api/cmu/create.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Token ${token.trim()}`
    },
    body: bodyString
  });

  const data = await response.json();

  if (!response.ok || !data.success || !data.packages || data.packages.length === 0) {
    console.error('Delhivery Shipment Creation Error Payload:', payload);
    console.error('Delhivery API Response Error:', data);
    const errMsg = data.rmk || (data.packages && data.packages[0]?.remarks?.join(', ')) || 'Failed to create order in Delhivery.';
    throw new Error(errMsg);
  }

  const pkg = data.packages[0];
  if (pkg.status !== 'Success') {
    throw new Error(pkg.remarks?.join(', ') || 'Delhivery returned unsuccessful status.');
  }

  return {
    waybill: pkg.waybill, // Airway Bill (AWB) number
    refnum: pkg.refnum
  };
};

/**
 * Tracks a shipment using the AWB code / Waybill
 * @param {string} awbCode Air Waybill number
 * @returns {Promise<Object>} Delhivery tracking API response
 */
export const trackDelhiveryShipment = async (awbCode) => {
  const token = process.env.DELHIVERY_API_TOKEN;
  const apiBaseUrl = process.env.DELHIVERY_API_URL || 'https://track.delhivery.com';

  if (!token) {
    throw new Error('Delhivery API Token is not defined in environmental variables.');
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/packages/json/?waybill=${awbCode}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${token.trim()}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to track shipment from Delhivery.');
  }
  return data;
};

/**
 * Cancels a booked shipment in Delhivery using AWB code
 * @param {string} awbCode Air Waybill number
 * @returns {Promise<Object>} Delhivery cancellation API response
 */
export const cancelDelhiveryShipment = async (awbCode) => {
  const token = process.env.DELHIVERY_API_TOKEN;
  const apiBaseUrl = process.env.DELHIVERY_API_URL || 'https://track.delhivery.com';

  if (!token) {
    throw new Error('Delhivery API Token is not defined in environmental variables.');
  }

  const response = await fetch(`${apiBaseUrl}/api/p/edit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${token.trim()}`
    },
    body: JSON.stringify({
      waybill: awbCode,
      cancellation: true
    })
  });

  const text = await response.text();
  if (!response.ok || (!text.includes('<status>True</status>') && !text.includes('True') && !text.includes('Success'))) {
    throw new Error(text || 'Failed to cancel shipment in Delhivery.');
  }
  return { success: true, message: 'Shipment cancelled successfully.' };
};
