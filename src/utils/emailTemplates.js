export const getInvoiceEmailTemplate = (order) => {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #475569; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b; text-align: right;">₹${item.price.toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Invoice</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 600px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px; }
        .header p { margin: 5px 0 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 30px; }
        .welcome-text { font-size: 16px; color: #0f172a; margin-top: 0; font-weight: 600; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0 25px 0; }
        .table th { background: #f1f5f9; padding: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #475569; text-align: left; border-bottom: 2px solid #e2e8f0; }
        .total-row td { padding: 10px 12px; font-size: 14px; color: #475569; }
        .grand-total { font-size: 16px !important; font-weight: bold !important; color: #10b981 !important; border-top: 2px solid #e2e8f0; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Vardaan Store</h1>
          <p>Order Confirmed & Invoice Receipt</p>
        </div>
        <div class="content">
          <p class="welcome-text">Hello ${order.user?.name || 'Customer'},</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">We have successfully processed the payment for your order. Here is your transaction summary.</p>
          
          <table style="width:100%; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:15px; margin: 20px 0; font-size:13px; border-spacing: 0 6px;">
            <tr><td style="color: #64748b;"><strong>Order Number:</strong></td><td style="text-align: right; font-weight: bold; color: #0f172a;">#${order._id}</td></tr>
            <tr><td style="color: #64748b;"><strong>Payment Mode:</strong></td><td style="text-align: right; color: #0f172a;">${order.paymentMethod}</td></tr>
            <tr><td style="color: #64748b;"><strong>Transaction Date:</strong></td><td style="text-align: right; color: #0f172a;">${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td></tr>
          </table>

          <table class="table">
            <thead>
              <tr>
                <th style="text-align: left;">Product Item</th>
                <th style="text-align: center; width: 60px;">Qty</th>
                <th style="text-align: right; width: 100px;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="2" style="text-align: right; font-weight: 500;">Shipping Cost:</td>
                <td style="text-align: right; font-weight: bold; color: #1e293b;">₹${order.shippingCost.toLocaleString('en-IN')}</td>
              </tr>
              <tr class="total-row">
                <td colspan="2" style="text-align: right; font-weight: bold;" class="grand-total">Grand Total:</td>
                <td style="text-align: right; font-weight: bold;" class="grand-total">₹${order.totalAmount.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          <h4 style="margin: 0 0 10px 0; color: #0f172a; font-size: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">Shipping Address</h4>
          <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
            <b>${order.user?.name}</b><br/>
            ${order.shippingAddress.street}<br/>
            ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.zipCode}<br/>
            ${order.shippingAddress.country}
          </p>
        </div>
        <div class="footer">
          <p>Thank you for shopping with Vardaan Store!</p>
          <p style="margin-top: 6px; font-size: 11px;">&copy; ${new Date().getFullYear()} Vardaan Store. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getStatusUpdateEmailTemplate = (order, title, message) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Status Update</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 600px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px; }
        .content { padding: 30px; }
        .welcome-text { font-size: 16px; color: #0f172a; margin-top: 0; font-weight: 600; }
        .update-box { background: #f0fdf4; border: 1px dashed #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .update-status { font-size: 18px; font-weight: bold; color: #047857; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 0.5px; }
        .update-desc { font-size: 14px; color: #065f46; margin: 0; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Vardaan Store</h1>
        </div>
        <div class="content">
          <p class="welcome-text">Hello ${order.user?.name || 'Customer'},</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">We wanted to update you on the progress of your order <b>#${order._id}</b>.</p>
          
          <div class="update-box">
            <p class="update-status">${title}</p>
            <p class="update-desc">${message}</p>
          </div>

          ${order.tracking?.awb ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; font-size: 13px; color: #475569; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Shipping Carrier:</strong> ${order.tracking.carrier}</p>
            <p style="margin: 4px 0;"><strong>Airway Bill (AWB):</strong> <span style="font-family: monospace; font-weight: bold; color: #10b981;">${order.tracking.awb}</span></p>
          </div>
          ` : ''}

          <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 20px 0 0 0;">You can check the dispatch details and track the shipment status anytime by logging into your Customer Dashboard.</p>
        </div>
        <div class="footer">
          <p>Thank you for shopping with Vardaan Store!</p>
          <p style="margin-top: 6px; font-size: 11px;">&copy; ${new Date().getFullYear()} Vardaan Store. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getWelcomeEmailTemplate = (name, otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to Vardaan - Verification Code</title>
      <style>
        body { font-family: 'Garamond', 'Georgia', 'Times New Roman', serif; background-color: #FAF9F6; margin: 0; padding: 20px; }
        .container { max-width: 580px; background: #ffffff; border: 1px solid #E5DCC5; border-radius: 8px; margin: 0 auto; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.03); }
        .header { background: #07512E; padding: 40px 30px; text-align: center; color: #ffffff; border-bottom: 3px solid #C4A46C; }
        .header h1 { margin: 0; font-size: 32px; font-weight: normal; letter-spacing: 2px; font-family: 'Playfair Display', serif; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; font-style: italic; letter-spacing: 1px; }
        .content { padding: 40px 35px; background: #ffffff; }
        .greeting { font-size: 18px; color: #303030; margin-top: 0; font-weight: normal; letter-spacing: 0.5px; }
        .lead-text { color: #555555; font-size: 15px; line-height: 1.7; margin-bottom: 25px; }
        .otp-box { background: #F8F5EE; border: 1px solid #E5DCC5; border-radius: 6px; padding: 25px; text-align: center; margin: 30px 0; }
        .otp-label { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #8C7547; margin-bottom: 10px; font-weight: bold; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: bold; color: #07512E; letter-spacing: 6px; margin: 0; }
        .expiry-note { font-size: 12px; color: #8A8A8A; margin-top: 10px; font-style: italic; }
        .benefits-list { font-size: 14px; color: #555555; line-height: 1.6; padding-left: 20px; margin-bottom: 30px; }
        .benefits-list li { margin-bottom: 10px; }
        .footer { background: #FAF9F6; padding: 25px; text-align: center; font-size: 12px; color: #8C7547; border-top: 1px solid #F0ECE3; }
        .footer p { margin: 4px 0; }
        .footer a { color: #07512E; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>VARDAAN</h1>
          <p>More than a Jewel, a Blessing</p>
        </div>
        <div class="content">
          <p class="greeting">Dear ${name},</p>
          <p class="lead-text">Thank you for choosing Vardaan. We are delighted to welcome you to our family of fine jewelry connoisseurs. To secure your account and complete your verification, please use the verification code details below:</p>
          
          <div class="otp-box">
            <div class="otp-label">Your Verification Code</div>
            <div class="otp-code">${otp}</div>
            <div class="expiry-note">This code is valid for the next 24 hours. Please do not share this code with anyone.</div>
          </div>

          <p class="lead-text" style="margin-bottom: 10px;">By completing your registration, you gain access to:</p>
          <ul class="benefits-list">
            <li>Curated collections of handcrafted rings, necklaces, and heirloom sets.</li>
            <li>Priority updates on new releases, bespoke design inquiries, and collector events.</li>
            <li>Seamless order management, fast dispatches, and responsive concierge support.</li>
          </ul>

          <p class="lead-text" style="margin-top: 25px;">If you did not initiate this request, please contact our concierge team immediately.</p>
          <p class="lead-text" style="margin-top: 30px; font-style: italic;">Warmest regards,<br/><b>The Vardaan Team</b></p>
        </div>
        <div class="footer">
          <p>Vardaan Fine Jewelry Store &bull; New Delhi, India</p>
          <p style="margin-top: 6px;">&copy; ${new Date().getFullYear()} Vardaan E-commerce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getForgotPasswordEmailTemplate = (name, otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your Vardaan Password</title>
      <style>
        body { font-family: 'Garamond', 'Georgia', 'Times New Roman', serif; background-color: #FAF9F6; margin: 0; padding: 20px; }
        .container { max-width: 580px; background: #ffffff; border: 1px solid #E5DCC5; border-radius: 8px; margin: 0 auto; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.03); }
        .header { background: #07512E; padding: 40px 30px; text-align: center; color: #ffffff; border-bottom: 3px solid #C4A46C; }
        .header h1 { margin: 0; font-size: 32px; font-weight: normal; letter-spacing: 2px; font-family: 'Playfair Display', serif; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; font-style: italic; letter-spacing: 1px; }
        .content { padding: 40px 35px; background: #ffffff; }
        .greeting { font-size: 18px; color: #303030; margin-top: 0; font-weight: normal; letter-spacing: 0.5px; }
        .lead-text { color: #555555; font-size: 15px; line-height: 1.7; margin-bottom: 25px; }
        .otp-box { background: #F8F5EE; border: 1px solid #E5DCC5; border-radius: 6px; padding: 25px; text-align: center; margin: 30px 0; }
        .otp-label { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #8C7547; margin-bottom: 10px; font-weight: bold; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: bold; color: #07512E; letter-spacing: 6px; margin: 0; }
        .expiry-note { font-size: 12px; color: #8A8A8A; margin-top: 10px; font-style: italic; }
        .footer { background: #FAF9F6; padding: 25px; text-align: center; font-size: 12px; color: #8C7547; border-top: 1px solid #F0ECE3; }
        .footer p { margin: 4px 0; }
        .footer a { color: #07512E; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>VARDAAN</h1>
          <p>More than a Jewel, a Blessing</p>
        </div>
        <div class="content">
          <p class="greeting">Dear ${name},</p>
          <p class="lead-text">We received a request to reset the password for your Vardaan account. To proceed with the password reset, please use the verification code details below:</p>
          
          <div class="otp-box">
            <div class="otp-label">Your Password Recovery Code</div>
            <div class="otp-code">${otp}</div>
            <div class="expiry-note">This code is valid for the next 30 minutes. Please do not share this code with anyone.</div>
          </div>

          <p class="lead-text">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          <p class="lead-text" style="margin-top: 30px; font-style: italic;">Warmest regards,<br/><b>The Vardaan Team</b></p>
        </div>
        <div class="footer">
          <p>Vardaan Fine Jewelry Store &bull; New Delhi, India</p>
          <p style="margin-top: 6px;">&copy; ${new Date().getFullYear()} Vardaan E-commerce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getOrderPlacedEmailTemplate = (order) => {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #303030;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #555555; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #303030; text-align: right;">₹${item.price.toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Vardaan Order Confirmation</title>
      <style>
        body { font-family: 'Garamond', 'Georgia', 'Times New Roman', serif; background-color: #FAF9F6; margin: 0; padding: 20px; }
        .container { max-width: 580px; background: #ffffff; border: 1px solid #E5DCC5; border-radius: 8px; margin: 0 auto; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.03); }
        .header { background: #07512E; padding: 40px 30px; text-align: center; color: #ffffff; border-bottom: 3px solid #C4A46C; }
        .header h1 { margin: 0; font-size: 32px; font-weight: normal; letter-spacing: 2px; font-family: 'Playfair Display', serif; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; font-style: italic; letter-spacing: 1px; }
        .content { padding: 40px 35px; background: #ffffff; }
        .greeting { font-size: 18px; color: #303030; margin-top: 0; font-weight: normal; letter-spacing: 0.5px; }
        .lead-text { color: #555555; font-size: 15px; line-height: 1.7; margin-bottom: 25px; }
        
        .order-info-card { background: #F8F5EE; border: 1px solid #E5DCC5; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .info-row:last-child { margin-bottom: 0; }
        .info-label { color: #8C7547; font-weight: bold; }
        .info-value { color: #303030; font-weight: bold; }

        .items-table { width: 100%; border-collapse: collapse; margin: 25px 0; }
        .items-table th { background: #F8F5EE; padding: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #8C7547; text-align: left; border-bottom: 1px solid #E5DCC5; }
        .items-table td { padding: 12px; border-bottom: 1px solid #F0ECE3; font-size: 14px; }
        .total-row td { padding: 10px 12px; font-size: 14px; color: #555555; }
        .grand-total { font-size: 16px !important; font-weight: bold !important; color: #07512E !important; border-top: 2px solid #E5DCC5; }

        .address-box { margin-top: 20px; font-size: 14px; color: #555555; line-height: 1.6; background: #F8F5EE; border: 1px solid #E5DCC5; border-radius: 6px; padding: 15px; }

        .footer { background: #FAF9F6; padding: 25px; text-align: center; font-size: 12px; color: #8C7547; border-top: 1px solid #F0ECE3; }
        .footer p { margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>VARDAAN</h1>
          <p>More than a Jewel, a Blessing</p>
        </div>
        <div class="content">
          <p class="greeting">Dear ${order.user?.name || 'Valued Customer'},</p>
          <p class="lead-text">Thank you for placing your order with Vardaan. We are delighted to assist you with your select jewelry collection. Here is a summary of your order details:</p>
          
          <table style="width: 100%; background: #F8F5EE; border: 1px solid #E5DCC5; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 14px; border-spacing: 0 6px;">
            <tr><td style="color: #8C7547;"><strong>Order Number:</strong></td><td style="text-align: right; font-weight: bold; color: #303030;">#${order._id}</td></tr>
            <tr><td style="color: #8C7547;"><strong>Payment Mode:</strong></td><td style="text-align: right; color: #303030;">${order.paymentMethod}</td></tr>
            <tr><td style="color: #8C7547;"><strong>Date Placed:</strong></td><td style="text-align: right; color: #303030;">${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td></tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left;">Jewelry Item</th>
                <th style="text-align: center; width: 60px;">Qty</th>
                <th style="text-align: right; width: 100px;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="2" style="text-align: right; font-weight: 500;">Shipping Cost:</td>
                <td style="text-align: right; font-weight: bold; color: #303030;">₹${order.shippingCost.toLocaleString('en-IN')}</td>
              </tr>
              <tr class="total-row">
                <td colspan="2" style="text-align: right; font-weight: bold;" class="grand-total">Total Amount:</td>
                <td style="text-align: right; font-weight: bold;" class="grand-total">₹${order.totalAmount.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          <h4 style="margin: 25px 0 10px 0; color: #07512E; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Delivery Address</h4>
          <p class="address-box">
            <b>${order.user?.name}</b><br/>
            ${order.shippingAddress.street}<br/>
            ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.zipCode}<br/>
            ${order.shippingAddress.country}
          </p>

          <p class="lead-text" style="margin-top: 30px;">We are currently verifying the order and preparing it for processing. You will receive another update as soon as your package is dispatched.</p>
          <p class="lead-text" style="margin-top: 30px; font-style: italic;">Warmest regards,<br/><b>The Vardaan Team</b></p>
        </div>
        <div class="footer">
          <p>Vardaan Fine Jewelry Store &bull; New Delhi, India</p>
          <p style="margin-top: 6px;">&copy; ${new Date().getFullYear()} Vardaan E-commerce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getReturnRequestedEmailTemplate = (order, returnRequest, name) => {
  const itemsHtml = returnRequest.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #303030;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #555555; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #303030; text-align: right;">₹${item.price.toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Vardaan Return Request Received</title>
      <style>
        body { font-family: 'Garamond', 'Georgia', 'Times New Roman', serif; background-color: #FAF9F6; margin: 0; padding: 20px; }
        .container { max-width: 580px; background: #ffffff; border: 1px solid #E5DCC5; border-radius: 8px; margin: 0 auto; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.03); }
        .header { background: #07512E; padding: 40px 30px; text-align: center; color: #ffffff; border-bottom: 3px solid #C4A46C; }
        .header h1 { margin: 0; font-size: 32px; font-weight: normal; letter-spacing: 2px; font-family: 'Playfair Display', serif; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; font-style: italic; letter-spacing: 1px; }
        .content { padding: 40px 35px; background: #ffffff; }
        .greeting { font-size: 18px; color: #303030; margin-top: 0; font-weight: normal; letter-spacing: 0.5px; }
        .lead-text { color: #555555; font-size: 15px; line-height: 1.7; margin-bottom: 25px; }
        
        .info-card { background: #F8F5EE; border: 1px solid #E5DCC5; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        
        .items-table { width: 100%; border-collapse: collapse; margin: 25px 0; }
        .items-table th { background: #F8F5EE; padding: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #8C7547; text-align: left; border-bottom: 1px solid #E5DCC5; }
        .items-table td { padding: 12px; border-bottom: 1px solid #F0ECE3; font-size: 14px; }

        .footer { background: #FAF9F6; padding: 25px; text-align: center; font-size: 12px; color: #8C7547; border-top: 1px solid #F0ECE3; }
        .footer p { margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>VARDAAN</h1>
          <p>Return Request Confirmation</p>
        </div>
        <div class="content">
          <p class="greeting">Dear ${name || 'Customer'},</p>
          <p class="lead-text">We have received your return request for Order <b>#${order._id}</b>. Our concierge team is currently reviewing your ticket. Here are the details of the return request:</p>
          
          <table style="width: 100%; background: #F8F5EE; border: 1px solid #E5DCC5; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 14px; border-spacing: 0 6px;">
            <tr><td style="color: #8C7547;"><strong>Order Number:</strong></td><td style="text-align: right; font-weight: bold; color: #303030;">#${order._id}</td></tr>
            <tr><td style="color: #8C7547;"><strong>Return Status:</strong></td><td style="text-align: right; color: #b7791f; font-weight: bold; text-transform: uppercase;">${returnRequest.status}</td></tr>
            <tr><td style="color: #8C7547;"><strong>Refund Method:</strong></td><td style="text-align: right; color: #303030; text-transform: uppercase;">${returnRequest.refundMethod}</td></tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left;">Returning Jewelry Item</th>
                <th style="text-align: center; width: 60px;">Qty</th>
                <th style="text-align: right; width: 100px;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <p class="lead-text" style="margin-top: 30px;">Our team typically reviews requests within 1-2 business days. You will receive an email update once the return is approved or processed.</p>
          <p class="lead-text" style="margin-top: 30px; font-style: italic;">Warmest regards,<br/><b>The Vardaan Team</b></p>
        </div>
        <div class="footer">
          <p>Vardaan Fine Jewelry Store &bull; New Delhi, India</p>
          <p style="margin-top: 6px;">&copy; ${new Date().getFullYear()} Vardaan E-commerce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getReturnStatusUpdateEmailTemplate = (order, returnRequest, name) => {
  const itemsHtml = returnRequest.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #303030;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #555555; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #303030; text-align: right;">₹${item.price.toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const statusColor = returnRequest.status === 'approved' || returnRequest.status === 'refunded' ? '#07512E' : returnRequest.status === 'rejected' ? '#c53030' : '#b7791f';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Vardaan Return Request Update</title>
      <style>
        body { font-family: 'Garamond', 'Georgia', 'Times New Roman', serif; background-color: #FAF9F6; margin: 0; padding: 20px; }
        .container { max-width: 580px; background: #ffffff; border: 1px solid #E5DCC5; border-radius: 8px; margin: 0 auto; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.03); }
        .header { background: #07512E; padding: 40px 30px; text-align: center; color: #ffffff; border-bottom: 3px solid #C4A46C; }
        .header h1 { margin: 0; font-size: 32px; font-weight: normal; letter-spacing: 2px; font-family: 'Playfair Display', serif; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; font-style: italic; letter-spacing: 1px; }
        .content { padding: 40px 35px; background: #ffffff; }
        .greeting { font-size: 18px; color: #303030; margin-top: 0; font-weight: normal; letter-spacing: 0.5px; }
        .lead-text { color: #555555; font-size: 15px; line-height: 1.7; margin-bottom: 25px; }
        
        .status-box { background: #F8F5EE; border: 1px dashed ${statusColor}; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0; }
        .status-title { font-size: 18px; font-weight: bold; color: ${statusColor}; text-transform: uppercase; margin-bottom: 5px; }
        .status-desc { font-size: 14px; color: #555555; margin: 0; }

        .items-table { width: 100%; border-collapse: collapse; margin: 25px 0; }
        .items-table th { background: #F8F5EE; padding: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #8C7547; text-align: left; border-bottom: 1px solid #E5DCC5; }
        .items-table td { padding: 12px; border-bottom: 1px solid #F0ECE3; font-size: 14px; }

        .footer { background: #FAF9F6; padding: 25px; text-align: center; font-size: 12px; color: #8C7547; border-top: 1px solid #F0ECE3; }
        .footer p { margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>VARDAAN</h1>
          <p>Return Status Update</p>
        </div>
        <div class="content">
          <p class="greeting">Dear ${name || 'Customer'},</p>
          <p class="lead-text">There has been an update regarding your return request for Order <b>#${order._id}</b>.</p>
          
          <div class="status-box">
            <div class="status-title">Return Status: ${returnRequest.status}</div>
            <p class="status-desc">
              ${returnRequest.adminNotes ? `Admin Notes: "${returnRequest.adminNotes}"` : `Your return request status has been updated to "${returnRequest.status}".`}
            </p>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left;">Jewelry Item</th>
                <th style="text-align: center; width: 60px;">Qty</th>
                <th style="text-align: right; width: 100px;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <p class="lead-text" style="margin-top: 30px;">For any questions, feel free to contact our concierge support desk.</p>
          <p class="lead-text" style="margin-top: 30px; font-style: italic;">Warmest regards,<br/><b>The Vardaan Team</b></p>
        </div>
        <div class="footer">
          <p>Vardaan Fine Jewelry Store &bull; New Delhi, India</p>
          <p style="margin-top: 6px;">&copy; ${new Date().getFullYear()} Vardaan E-commerce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
