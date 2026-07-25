export const getInvoiceEmailTemplate = (order) => {
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #303030;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #555555; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #303030; text-align: right;">₹${item.price.toLocaleString("en-IN")}</td>
    </tr>
  `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Receipt & Invoice</title>
      <style>
        body { font-family: 'Garamond', 'Georgia', 'Times New Roman', serif; background-color: #FAF9F6; margin: 0; padding: 20px; }
        .container { max-width: 580px; background: #ffffff; border: 1px solid #E5DCC5; border-radius: 8px; margin: 0 auto; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.03); }
        .header { background: #07512E; padding: 40px 30px; text-align: center; color: #ffffff; border-bottom: 3px solid #C4A46C; }
        .header h1 { margin: 0; font-size: 32px; font-weight: normal; letter-spacing: 2px; font-family: 'Playfair Display', serif; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; font-style: italic; letter-spacing: 1px; }
        .content { padding: 40px 35px; background: #ffffff; }
        .welcome-text { font-size: 18px; color: #303030; margin-top: 0; font-weight: normal; letter-spacing: 0.5px; }
        
        .invoice-table { width: 100%; border-collapse: collapse; margin: 25px 0; }
        .invoice-table th { background: #F8F5EE; padding: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #8C7547; text-align: left; border-bottom: 1px solid #E5DCC5; }
        .invoice-table td { padding: 12px; border-bottom: 1px solid #F0ECE3; font-size: 14px; }
        
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
          <img src="https://res.cloudinary.com/dxlykgx6w/image/upload/v1783322584/Vardaan_jewel_logo-removebg-preview_q2mgqj.png" alt="VARDAAN" style="height:80px; object-fit:contain; display:block; margin:0 auto 8px;" />
          <p>Payment Invoice & Receipt</p>
        </div>
        <div class="content">
          <p class="welcome-text">Dear ${order.user?.name || "Customer"},</p>
          <p style="color: #555555; font-size: 15px; line-height: 1.7; margin: 0;">We have successfully received the payment for your order. Your transaction is complete and the order is confirmed for fulfillment. Here is your receipt summary:</p>
          
          <table style="width: 100%; background: #F8F5EE; border: 1px solid #E5DCC5; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 14px; border-spacing: 0 6px;">
            <tr><td style="color: #8C7547;"><strong>Seller:</strong></td><td style="text-align: right; font-weight: bold; color: #303030;">Vardaan Jewels</td></tr>
            <tr><td style="color: #8C7547;"><strong>GSTIN:</strong></td><td style="text-align: right; font-family: monospace; font-weight: bold; color: #303030;">09BDEPJ1387D1ZN</td></tr>
            <tr><td style="color: #8C7547;"><strong>Order Number:</strong></td><td style="text-align: right; font-weight: bold; color: #303030;">#${order._id}</td></tr>
            <tr><td style="color: #8C7547;"><strong>Payment Method:</strong></td><td style="text-align: right; color: #303030; text-transform: uppercase;">${order.paymentMethod}</td></tr>
            <tr><td style="color: #8C7547;"><strong>Transaction Date:</strong></td><td style="text-align: right; color: #303030;">${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td></tr>
            <tr><td style="color: #8C7547;"><strong>Payment Status:</strong></td><td style="text-align: right; font-weight: bold; color: #07512E; text-transform: uppercase;">PAID</td></tr>
          </table>

          <table class="invoice-table">
            <thead>
              <tr>
                <th style="text-align: left;">Jewelry Item</th>
                <th style="text-align: center; width: 60px;">Qty</th>
                <th style="text-align: right; width: 100px;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              ${
                order.codCharge > 0
                  ? `
              <tr class="total-row">
                <td colspan="2" style="text-align: right; font-weight: 500; color: #dc2626;">Handling Charge:</td>
                <td style="text-align: right; font-weight: bold; color: #dc2626;">₹${order.codCharge.toLocaleString("en-IN")}</td>
              </tr>
              `
                  : ""
              }
              ${
                order.onlineDiscount > 0
                  ? `
              <tr class="total-row">
                <td colspan="2" style="text-align: right; font-weight: 500; color: #07512E;">Online Payment Discount (5%):</td>
                <td style="text-align: right; font-weight: bold; color: #07512E;">-₹${order.onlineDiscount.toLocaleString("en-IN")}</td>
              </tr>
              `
                  : ""
              }
              <tr class="total-row">
                <td colspan="2" style="text-align: right; font-weight: 500;">Shipping Cost:</td>
                <td style="text-align: right; font-weight: bold; color: #303030;">₹${order.shippingCost.toLocaleString("en-IN")}</td>
              </tr>
              <tr class="total-row">
                <td colspan="2" style="text-align: right; font-weight: bold;" class="grand-total">Total Paid <span style="font-size: 11px; font-weight: normal; color: #555555; display: block;">(Inclusive of GST)</span>:</td>
                <td style="text-align: right; font-weight: bold;" class="grand-total">₹${order.totalAmount.toLocaleString("en-IN")}</td>
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

          <p style="color: #555555; font-size: 15px; line-height: 1.7; margin-top: 30px;">Your items will be packaged and prepared for shipping shortly. We will update you with tracking details once dispatched.</p>
          <p style="color: #777777; font-size: 12px; line-height: 1.5; margin-top: 15px; border-top: 1px dashed #E5DCC5; padding-top: 10px;">* Note: All prices shown are inclusive of GST.</p>
          <p style="color: #555555; font-size: 15px; line-height: 1.7; margin-top: 20px; font-style: italic;">Warmest regards,<br/><b>The Vardaan Team</b></p>
        </div>
        <div class="footer">
          <p>Vardaan Jewels</p>
          <p style="margin-top: 6px;">&copy; ${new Date().getFullYear()} Vardaan E-commerce. All rights reserved.</p>
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
      <title>Order Update</title>
      <style>
        body { font-family: 'Garamond', 'Georgia', 'Times New Roman', serif; background-color: #FAF9F6; margin: 0; padding: 20px; }
        .container { max-width: 580px; background: #ffffff; border: 1px solid #E5DCC5; border-radius: 8px; margin: 0 auto; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.03); }
        .header { background: #07512E; padding: 40px 30px; text-align: center; color: #ffffff; border-bottom: 3px solid #C4A46C; }
        .header h1 { margin: 0; font-size: 32px; font-weight: normal; letter-spacing: 2px; font-family: 'Playfair Display', serif; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; font-style: italic; letter-spacing: 1px; }
        .content { padding: 40px 35px; background: #ffffff; }
        .welcome-text { font-size: 18px; color: #303030; margin-top: 0; font-weight: normal; letter-spacing: 0.5px; }
        
        .update-box { background: #F8F5EE; border: 1px dashed #07512E; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0; }
        .update-status { font-size: 18px; font-weight: bold; color: #07512E; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 0.5px; }
        .update-desc { font-size: 15px; color: #555555; margin: 0; line-height: 1.6; }
        
        .footer { background: #FAF9F6; padding: 25px; text-align: center; font-size: 12px; color: #8C7547; border-top: 1px solid #F0ECE3; }
        .footer p { margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://res.cloudinary.com/dxlykgx6w/image/upload/v1783322584/Vardaan_jewel_logo-removebg-preview_q2mgqj.png" alt="VARDAAN" style="height:80px; object-fit:contain; display:block; margin:0 auto 8px;" />
          <p>Order Status Update</p>
        </div>
        <div class="content">
          <p class="welcome-text">Dear ${order.user?.name || "Customer"},</p>
          <p style="color: #555555; font-size: 15px; line-height: 1.7; margin: 0;">We wanted to update you on the progress of your order <b>#${order._id}</b>.</p>
          
          <div class="update-box">
            <p class="update-status">${title}</p>
            <p class="update-desc">${message}</p>
          </div>

          ${
            order.tracking?.awb
              ? `
          <div style="background: #F8F5EE; border: 1px solid #E5DCC5; border-radius: 6px; padding: 20px; font-size: 14px; color: #555555; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Shipping Carrier:</strong> ${order.tracking.carrier}</p>
            <p style="margin: 4px 0;"><strong>Tracking Number (AWB):</strong> <span style="font-family: monospace; font-weight: bold; color: #07512E;">${order.tracking.awb}</span></p>
            <div style="margin-top: 15px;">
              <a href="https://shiprocket.co/tracking/${order.tracking.awb}" target="_blank" style="background: #07512E; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: bold; display: inline-block;">Track Your Package</a>
            </div>
          </div>
          `
              : ""
          }

          <p style="font-size: 14px; color: #8C7547; line-height: 1.6; margin: 20px 0 0 0;">You can check the dispatch details and track the shipment status anytime by logging into your Customer Dashboard.</p>
        </div>
        <div class="footer">
          <p>Vardaan Jewels</p>
          <p style="margin-top: 6px;">&copy; ${new Date().getFullYear()} Vardaan E-commerce. All rights reserved.</p>
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
          <img src="https://res.cloudinary.com/dxlykgx6w/image/upload/v1783322584/Vardaan_jewel_logo-removebg-preview_q2mgqj.png" alt="VARDAAN" style="height:80px; object-fit:contain; display:block; margin:0 auto 8px;" />
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
          <p>Vardaan Jewels</p>
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
        .note-box { background: #F8F5EE; border-left: 4px solid #C4A46C; padding: 14px 16px; border-radius: 4px; margin-top: 20px; color: #555555; font-size: 14px; line-height: 1.6; }
        .footer { background: #FAF9F6; padding: 25px; text-align: center; font-size: 12px; color: #8C7547; border-top: 1px solid #F0ECE3; }
        .footer p { margin: 4px 0; }
        .footer a { color: #07512E; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://res.cloudinary.com/dxlykgx6w/image/upload/v1783322584/Vardaan_jewel_logo-removebg-preview_q2mgqj.png" alt="VARDAAN" style="height:80px; object-fit:contain; display:block; margin:0 auto 8px;" />
        </div>
        <div class="content">
          <p class="greeting">Dear ${name},</p>
          <p class="lead-text">We received a request to reset the password for your Vardaan account. To continue securely, please use the verification code below:</p>
          
          <div class="otp-box">
            <div class="otp-label">Your Password Recovery Code</div>
            <div class="otp-code">${otp}</div>
            <div class="expiry-note">This code is valid for the next 30 minutes. Please do not share this code with anyone.</div>
          </div>

          <div class="note-box">
            If you did not request this change, you can safely ignore this email. Your password will remain unchanged and no other action is required.
          </div>
          <p class="lead-text" style="margin-top: 30px; font-style: italic;">Warmest regards,<br/><b>The Vardaan Team</b></p>
        </div>
        <div class="footer">
          <p>Vardaan Jewels</p>
          <p style="margin-top: 6px;">&copy; ${new Date().getFullYear()} Vardaan E-commerce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getOrderPlacedEmailTemplate = (order) => {
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #303030;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #555555; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #303030; text-align: right;">₹${item.price.toLocaleString("en-IN")}</td>
    </tr>
  `,
    )
    .join("");

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
          <img src="https://res.cloudinary.com/dxlykgx6w/image/upload/v1783322584/Vardaan_jewel_logo-removebg-preview_q2mgqj.png" alt="VARDAAN" style="height:80px; object-fit:contain; display:block; margin:0 auto 8px;" />
        </div>
        <div class="content">
          <p class="greeting">Dear ${order.user?.name || "Valued Customer"},</p>
          <p class="lead-text">Thank you for placing your order with Vardaan. We are delighted to assist you with your select jewelry collection. Here is a summary of your order details:</p>
          
          <table style="width: 100%; background: #F8F5EE; border: 1px solid #E5DCC5; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 14px; border-spacing: 0 6px;">
            <tr><td style="color: #8C7547;"><strong>Seller:</strong></td><td style="text-align: right; font-weight: bold; color: #303030;">Vardaan Jewels</td></tr>
            <tr><td style="color: #8C7547;"><strong>GSTIN:</strong></td><td style="text-align: right; font-family: monospace; font-weight: bold; color: #303030;">09BDEPJ1387D1ZN</td></tr>
            <tr><td style="color: #8C7547;"><strong>Order Number:</strong></td><td style="text-align: right; font-weight: bold; color: #303030;">#${order._id}</td></tr>
            <tr><td style="color: #8C7547;"><strong>Payment Mode:</strong></td><td style="text-align: right; color: #303030;">${order.paymentMethod}</td></tr>
            <tr><td style="color: #8C7547;"><strong>Date Placed:</strong></td><td style="text-align: right; color: #303030;">${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td></tr>
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
              ${
                order.codCharge > 0
                  ? `
              <tr class="total-row">
                <td colspan="2" style="text-align: right; font-weight: 500; color: #dc2626;">Handling Charge:</td>
                <td style="text-align: right; font-weight: bold; color: #dc2626;">₹${order.codCharge.toLocaleString("en-IN")}</td>
              </tr>
              `
                  : ""
              }
              ${
                order.onlineDiscount > 0
                  ? `
              <tr class="total-row">
                <td colspan="2" style="text-align: right; font-weight: 500; color: #07512E;">Online Payment Discount (5%):</td>
                <td style="text-align: right; font-weight: bold; color: #07512E;">-₹${order.onlineDiscount.toLocaleString("en-IN")}</td>
              </tr>
              `
                  : ""
              }
              <tr class="total-row">
                <td colspan="2" style="text-align: right; font-weight: 500;">Shipping Cost:</td>
                <td style="text-align: right; font-weight: bold; color: #303030;">₹${order.shippingCost.toLocaleString("en-IN")}</td>
              </tr>
              <tr class="total-row">
                <td colspan="2" style="text-align: right; font-weight: bold;" class="grand-total">Total Amount <span style="font-size: 11px; font-weight: normal; color: #555555; display: block;">(Inclusive of GST)</span>:</td>
                <td style="text-align: right; font-weight: bold;" class="grand-total">₹${order.totalAmount.toLocaleString("en-IN")}</td>
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
          <p style="color: #777777; font-size: 12px; line-height: 1.5; margin-top: 15px; border-top: 1px dashed #E5DCC5; padding-top: 10px;">* Note: All prices shown are inclusive of GST.</p>
          <p class="lead-text" style="margin-top: 20px; font-style: italic;">Warmest regards,<br/><b>The Vardaan Team</b></p>
        </div>
        <div class="footer">
          <p>Vardaan Jewels</p>
          <p style="margin-top: 6px;">&copy; ${new Date().getFullYear()} Vardaan E-commerce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getReturnRequestedEmailTemplate = (
  order,
  replacementRequest,
  name,
) => {
  const itemsHtml = replacementRequest.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #303030;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #555555; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #303030; text-align: right;">₹${item.price.toLocaleString("en-IN")}</td>
    </tr>
  `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Vardaan Replacement Request Received</title>
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
          <img src="https://res.cloudinary.com/dxlykgx6w/image/upload/v1783322584/Vardaan_jewel_logo-removebg-preview_q2mgqj.png" alt="VARDAAN" style="height:80px; object-fit:contain; display:block; margin:0 auto 8px;" />
          <p>Replacement Request Confirmation</p>
        </div>
        <div class="content">
          <p class="greeting">Dear ${name || "Customer"},</p>
          <p class="lead-text">We have received your replacement request for Order <b>#${order._id}</b>. Our concierge team is currently reviewing your ticket. Here are the details of the request:</p>
          
          <table style="width: 100%; background: #F8F5EE; border: 1px solid #E5DCC5; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 14px; border-spacing: 0 6px;">
            <tr><td style="color: #8C7547;"><strong>Order Number:</strong></td><td style="text-align: right; font-weight: bold; color: #303030;">#${order._id}</td></tr>
            <tr><td style="color: #8C7547;"><strong>Request Status:</strong></td><td style="text-align: right; color: #b7791f; font-weight: bold; text-transform: uppercase;">${replacementRequest.status}</td></tr>
            <tr><td style="color: #8C7547;"><strong>Reason:</strong></td><td style="text-align: right; color: #303030;">${replacementRequest.reason}</td></tr>
            <tr><td style="color: #8C7547;"><strong>Description:</strong></td><td style="text-align: right; color: #303030;">${replacementRequest.description}</td></tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left;">Replacement Jewelry Item</th>
                <th style="text-align: center; width: 60px;">Qty</th>
                <th style="text-align: right; width: 100px;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <p class="lead-text" style="margin-top: 30px;">Our team typically reviews requests within 1–2 business days. You will receive an email update once the replacement is approved or updated.</p>
          <p class="lead-text" style="margin-top: 30px; font-style: italic;">Warmest regards,<br/><b>The Vardaan Team</b></p>
        </div>
        <div class="footer">
          <p>Vardaan Jewels</p>
          <p style="margin-top: 6px;">&copy; ${new Date().getFullYear()} Vardaan E-commerce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getReturnStatusUpdateEmailTemplate = (
  order,
  replacementRequest,
  name,
) => {
  const itemsHtml = replacementRequest.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #303030;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #555555; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #FAF9F6; font-size: 14px; color: #303030; text-align: right;">₹${item.price.toLocaleString("en-IN")}</td>
    </tr>
  `,
    )
    .join("");

  const statusColor =
    replacementRequest.status === "approved" ||
    replacementRequest.status === "replaced"
      ? "#07512E"
      : replacementRequest.status === "rejected"
        ? "#c53030"
        : "#b7791f";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Vardaan Replacement Request Update</title>
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
          <img src="https://res.cloudinary.com/dxlykgx6w/image/upload/v1783322584/Vardaan_jewel_logo-removebg-preview_q2mgqj.png" alt="VARDAAN" style="height:80px; object-fit:contain; display:block; margin:0 auto 8px;" />
          <p>Replacement Status Update</p>
        </div>
        <div class="content">
          <p class="greeting">Dear ${name || "Customer"},</p>
          <p class="lead-text">There has been an update regarding your replacement request for Order <b>#${order._id}</b>.</p>
          
          <div class="status-box">
            <div class="status-title">Status: ${replacementRequest.status}</div>
            <p class="status-desc">
              ${replacementRequest.adminNotes ? `Admin Notes: "${replacementRequest.adminNotes}"` : `Your request status has been updated to "${replacementRequest.status}".`}
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

          <p class="lead-text" style="margin-top: 30px;">For any questions, feel free to contact our support desk.</p>
          <p class="lead-text" style="margin-top: 30px; font-style: italic;">Warmest regards,<br/><b>The Vardaan Team</b></p>
        </div>
        <div class="footer">
          <p>Vardaan Jewels</p>
          <p style="margin-top: 6px;">&copy; ${new Date().getFullYear()} Vardaan E-commerce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getContactThankYouEmailTemplate = (name, subject, message) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Thank You for Contacting Vardaan</title>
      <style>
        body { font-family: 'Garamond', 'Georgia', 'Times New Roman', serif; background-color: #FAF9F6; margin: 0; padding: 20px; }
        .container { max-width: 580px; background: #ffffff; border: 1px solid #E5DCC5; border-radius: 8px; margin: 0 auto; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.03); }
        .header { background: #07512E; padding: 40px 30px; text-align: center; color: #ffffff; border-bottom: 3px solid #C4A46C; }
        .header h1 { margin: 0; font-size: 32px; font-weight: normal; letter-spacing: 2px; font-family: 'Playfair Display', serif; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; font-style: italic; letter-spacing: 1px; }
        .content { padding: 40px 35px; background: #ffffff; }
        .greeting { font-size: 18px; color: #303030; margin-top: 0; font-weight: normal; letter-spacing: 0.5px; }
        .lead-text { color: #555555; font-size: 15px; line-height: 1.7; margin-bottom: 25px; }
        .inquiry-summary { background: #F8F5EE; border: 1px solid #E5DCC5; border-radius: 6px; padding: 20px; margin: 25px 0; }
        .inquiry-title { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #8C7547; margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #E5DCC5; padding-bottom: 5px; }
        .inquiry-item { font-size: 14px; color: #555555; margin-bottom: 8px; line-height: 1.5; }
        .inquiry-item strong { color: #303030; }
        .footer { background: #FAF9F6; padding: 25px; text-align: center; font-size: 12px; color: #8C7547; border-top: 1px solid #F0ECE3; }
        .footer p { margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://res.cloudinary.com/dxlykgx6w/image/upload/v1783322584/Vardaan_jewel_logo-removebg-preview_q2mgqj.png" alt="VARDAAN" style="height:80px; object-fit:contain; display:block; margin:0 auto 8px;" />
        </div>
        <div class="content">
          <p class="greeting">Dear ${name},</p>
          <p class="lead-text">Thank you for reaching out to the Vardaan Concierge team. We have received your inquiry and our team is already reviewing it. A private consultant has been assigned to your request and will reply within 12 hours.</p>
          
          <div class="inquiry-summary">
            <div class="inquiry-title">Inquiry Details Received</div>
            <div class="inquiry-item"><strong>Subject:</strong> ${subject}</div>
            <div class="inquiry-item"><strong>Message Summary:</strong><br/>${message}</div>
          </div>
 
          <p class="lead-text">We look forward to assisting you in finding or customizing your perfect jewelry creation.</p>
          <p class="lead-text" style="margin-top: 30px; font-style: italic;">Warmest regards,<br/><b>The Vardaan Concierge Team</b></p>
        </div>
        <div class="footer">
          <p>Vardaan Jewels</p>
          <p style="margin-top: 6px;">&copy; ${new Date().getFullYear()} Vardaan E-commerce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getAccountStatusEmailTemplate = (name, isActive) => {
  const statusTitle = isActive ? "Account Activated" : "Account Suspended";
  const statusMessage = isActive
    ? "We are pleased to inform you that your Vardaan account has been successfully activated. You can now log in, browse our fine jewelry collection, place orders, and manage your account details."
    : "We regret to inform you that your Vardaan account has been temporarily suspended/deactivated. If you believe this is a misunderstanding or wish to appeal this decision, please contact our concierge support desk.";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Vardaan - ${statusTitle}</title>
      <style>
        body { font-family: 'Garamond', 'Georgia', 'Times New Roman', serif; background-color: #FAF9F6; margin: 0; padding: 20px; }
        .container { max-width: 580px; background: #ffffff; border: 1px solid #E5DCC5; border-radius: 8px; margin: 0 auto; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.03); }
        .header { background: #07512E; padding: 40px 30px; text-align: center; color: #ffffff; border-bottom: 3px solid #C4A46C; }
        .header h1 { margin: 0; font-size: 32px; font-weight: normal; letter-spacing: 2px; font-family: 'Playfair Display', serif; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; font-style: italic; letter-spacing: 1px; }
        .content { padding: 40px 35px; background: #ffffff; }
        .greeting { font-size: 18px; color: #303030; margin-top: 0; font-weight: normal; letter-spacing: 0.5px; }
        .lead-text { color: #555555; font-size: 15px; line-height: 1.7; margin-bottom: 25px; }
        .status-box { background: #F8F5EE; border: 1px solid #E5DCC5; border-radius: 6px; padding: 25px; text-align: center; margin: 30px 0; }
        .status-label { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #8C7547; margin-bottom: 10px; font-weight: bold; }
        .status-title { font-size: 24px; font-weight: bold; color: ${isActive ? "#07512E" : "#dc2626"}; letter-spacing: 1px; margin: 0; }
        .footer { background: #FAF9F6; padding: 25px; text-align: center; font-size: 12px; color: #8C7547; border-top: 1px solid #F0ECE3; }
        .footer p { margin: 4px 0; }
        .footer a { color: #07512E; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://res.cloudinary.com/dxlykgx6w/image/upload/v1783322584/Vardaan_jewel_logo-removebg-preview_q2mgqj.png" alt="VARDAAN" style="height:80px; object-fit:contain; display:block; margin:0 auto 8px;" />
        </div>
        <div class="content">
          <p class="greeting">Dear ${name},</p>
          <p class="lead-text">There has been an update regarding your customer account status with Vardaan.</p>
          
          <div class="status-box">
            <div class="status-label">Account Status Update</div>
            <div class="status-title">${statusTitle}</div>
          </div>

          <p class="lead-text">${statusMessage}</p>
          
          ${
            isActive
              ? `
          <p class="lead-text">To log in, please visit our website and sign in with your registered credentials.</p>
          `
              : `
          <p class="lead-text">If you have any pending orders, they may be put on hold or cancelled. For further clarification, please get in touch with our support representatives.</p>
          `
          }

          <p class="lead-text" style="margin-top: 30px; font-style: italic;">Warmest regards,<br/><b>The Vardaan Team</b></p>
        </div>
        <div class="footer">
          <p>Vardaan Jewels</p>
          <p style="margin-top: 6px;">&copy; ${new Date().getFullYear()} Vardaan E-commerce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
