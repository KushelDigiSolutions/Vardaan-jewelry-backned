/**
 * Shiprocket Logistics Integration Utility
 * Production-ready service utilizing native fetch.
 */

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

/**
 * Authenticates with Shiprocket API to obtain JWT token
 * @returns {Promise<string>} JWT Token
 */
export const authenticateShiprocket = async () => {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error('Shiprocket credentials are not defined in environmental variables.');
  }

  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email.trim(), password: password.trim() }),
  });
  console.log(response)
  const data = await response.json();
  console.log(data)

  if (!response.ok || !data.token) {
    throw new Error(data.message || 'Shiprocket authentication failed.');
  }

  return data.token;
};

/**
 * Retrieves the available pickup location nicknames from Shiprocket dashboard.
 * Dynamically resolves the best pickup location.
 * @param {string} token Shiprocket JWT Token
 * @returns {Promise<string>} Pickup location nickname
 */
export const getPickupLocation = async (token) => {
  try {
    const response = await fetch(`${BASE_URL}/settings/company/pickup`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const result = await response.json();
    if (response.ok && result.data && result.data.shipping_address) {
      const addresses = result.data.shipping_address;
      if (Array.isArray(addresses) && addresses.length > 0) {
        // Look for a location named 'Primary' case insensitively
        const primaryLoc = addresses.find(
          addr => addr.pickup_location.toLowerCase() === 'primary'
        );
        if (primaryLoc) {
          return primaryLoc.pickup_location;
        }
        return addresses[0].pickup_location;
      } else if (typeof addresses === 'object' && addresses.pickup_location) {
        return addresses.pickup_location;
      }
    }
  } catch (err) {
    console.error('Failed to fetch Shiprocket pickup locations dynamically:', err);
  }
  return process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary';
};

/**
 * Registers an adhoc order in Shiprocket
 * @param {Object} order Mongoose order document
 * @param {Object} user User profile document
 * @returns {Promise<Object>} Shipment details containing order_id and shipment_id
 */
export const createShiprocketOrder = async (order, user) => {
  const token = await authenticateShiprocket();
  const resolvedPickupLocation = await getPickupLocation(token);

  // Split name safely
  const fullName = user?.name || 'Customer';
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.slice(1).join(' ') || 'Store';

  // Format date: YYYY-MM-DD HH:MM
  const orderDate = new Date(order.createdAt);
  const formattedDate = orderDate.toISOString().replace(/T/, ' ').replace(/\..+/, '').substring(0, 16);

  // Map order items and strictly sanitize SKUs to be alphanumeric only
  const orderItems = order.items.map(item => {
    let sku = (item.product?.sku || `SKU-${item.product?._id || item.product || Math.random().toString(36).substring(7)}`)
      .replace(/[^a-zA-Z0-9-]/g, '')
      .trim();
    if (!sku) sku = 'SKU-JEWELRY';

    return {
      name: item.name || 'Jewelry Item',
      sku: sku,
      units: Number(item.quantity) || 1,
      selling_price: Number(item.price) || 0,
    };
  });

  // Strict Phone Sanitization (Must be numeric and exactly 10 digits for Indian carriers)
  let phone = (order.shippingAddress.mobile || user?.mobile || '9999999999').replace(/[^0-9]/g, '');
  if (phone.length < 10) {
    phone = '9999999999';
  } else {
    phone = phone.slice(-10);
  }

  // Pincode Sanitization (Must be 6 numeric digits)
  const pincode = order.shippingAddress.zipCode.replace(/[^0-9]/g, '').slice(0, 6) || '110001';

  const payload = {
    order_id: order._id.toString(),
    order_date: formattedDate,
    pickup_location: resolvedPickupLocation,
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: order.shippingAddress.street,
    billing_city: order.shippingAddress.city,
    billing_pincode: pincode,
    billing_state: order.shippingAddress.state,
    billing_country: order.shippingAddress.country || 'India',
    billing_email: user?.email || 'customer@vardaanecom.com',
    billing_phone: phone,
    shipping_is_billing: true,
    order_items: orderItems,
    payment_method: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
    sub_total: order.totalAmount - order.shippingCost,
    length: 10,  // Defaults optimized for jewelry boxes
    breadth: 10,
    height: 5,
    weight: 0.2, // Default weight 200g
  };

  const response = await fetch(`${BASE_URL}/orders/create/adhoc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.shipment_id) {
    console.error('Shiprocket Order Creation Error Payload:', payload);
    console.error('Shiprocket API Response Error:', data);
    
    // Extract internal API error details if present
    const errors = data.errors ? JSON.stringify(data.errors) : '';
    throw new Error(data.message || `${errors}` || 'Failed to create order in Shiprocket.');
  }

  return {
    shipmentId: data.shipment_id,
    shiprocketOrderId: data.order_id,
  };
};

/**
 * Assigns an AWB tracking number to a shipment
 * @param {number|string} shipmentId Shiprocket Shipment ID
 * @returns {Promise<Object>} Object containing awb_code and courier_name
 */
export const generateAWB = async (shipmentId) => {
  const token = await authenticateShiprocket();

  const response = await fetch(`${BASE_URL}/courier/assign/awb`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ shipment_id: shipmentId }),
  });

  const data = await response.json();

  if (!response.ok || !data.response || data.response.status !== 1) {
    console.error('Shiprocket AWB Assignment Error:', data);
    const apiError = data.response?.error || data.message || 'Failed to assign AWB via Shiprocket.';
    throw new Error(typeof apiError === 'object' ? JSON.stringify(apiError) : apiError);
  }

  const result = data.response.data;

  return {
    awb: result.awb_code,
    courier: result.courier_name || 'Shiprocket Cargo',
  };
};
