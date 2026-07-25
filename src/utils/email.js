import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, text, html, fromType }) => {
  const host = process.env.EMAIL_HOST || 'smtpout.secureserver.net';
  const port = Number(process.env.EMAIL_PORT || 587);

  // Default fallback is the main environment credentials
  let user = process.env.EMAIL_USER;
  let pass = process.env.EMAIL_PASS;
  let fromAddress = process.env.FROM_EMAIL || user;
  let fromName = "Vardaan Jewels";

  // Check if it's explicitly 'support' or contains support-related words in the content
  const isSupportType = 
    fromType === 'support' || 
    (fromType !== 'system' && (
      subject?.toLowerCase().includes('contact') || 
      subject?.toLowerCase().includes('support') || 
      subject?.toLowerCase().includes('return') || 
      subject?.toLowerCase().includes('replace') || 
      subject?.toLowerCase().includes('refund') || 
      subject?.toLowerCase().includes('suspend') || 
      subject?.toLowerCase().includes('activate') ||
      text?.toLowerCase().includes('contact us') ||
      text?.toLowerCase().includes('support ticket')
    ));

  if (isSupportType) {
    user = process.env.SUPPORT_EMAIL_USER || 'support@vardaanjewels.com';
    pass = process.env.SUPPORT_EMAIL_PASS || 'Shilpi.shivi02';
    fromAddress = 'support@vardaanjewels.com';
    fromName = process.env.SUPPORT_EMAIL_FROM_NAME || "Vardaan Jewels Support";
  } else {
    // Explicitly enforce system credentials if set, otherwise default to env fallback
    user = process.env.SYSTEM_EMAIL_USER || user || 'noreply@vardaanjewels.com';
    pass = process.env.SYSTEM_EMAIL_PASS || pass || 'Shilpi.shivi02';
    fromAddress = 'noreply@vardaanjewels.com';
    fromName = process.env.SYSTEM_EMAIL_FROM_NAME || "Vardaan Jewels";
  }

  const from = `"${fromName}" <${fromAddress}>`;

  if (!user || !pass) {
    console.log(`\n=================== [MOCK EMAIL LOG] ===================`);
    console.log(`FROM: ${from}`);
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`CONTENT: ${text}`);
    console.log(`========================================================\n`);
    return { success: true, message: 'Mock email logged successfully' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html
    });

    console.log(`Email sent successfully via ${fromAddress}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Error sending email via nodemailer (${fromAddress}):`, error);
    // Silent fail so API doesn't crash on invalid SMTP config
    return { success: false, error: error.message };
  }
};
