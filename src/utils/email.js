import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, text, html }) => {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const from = process.env.FROM_EMAIL || user || 'noreply@vardaanecom.com';

  if (!user || !pass) {
    console.log(`\n=================== [MOCK EMAIL LOG] ===================`);
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

    console.log(`Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email via nodemailer:', error);
    // Silent fail so API doesn't crash on invalid SMTP config
    return { success: false, error: error.message };
  }
};
