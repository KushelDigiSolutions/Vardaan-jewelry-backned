import ContactMessage from '../models/ContactMessage.js';
import { sendEmail } from '../utils/email.js';
import { getContactThankYouEmailTemplate } from '../utils/emailTemplates.js';

// Post a contact message (Public)
export const createContactMessage = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    const contact = await ContactMessage.create({
      name,
      email,
      phone,
      subject,
      message
    });

    // Send thank you email to customer
    const emailHtml = getContactThankYouEmailTemplate(name, subject, message);
    await sendEmail({
      to: email,
      subject: 'Thank you for contacting Vardaan Concierge',
      text: `Hello ${name},\n\nThank you for reaching out to the Vardaan Concierge team. We have received your inquiry ("${subject}") and a consultant will get back to you shortly.\n\nBest regards,\nThe Vardaan Team`,
      html: emailHtml
    });

    res.status(201).json({ success: true, message: 'Your message has been recorded. We will contact you shortly.', data: contact });
  } catch (error) {
    next(error);
  }
};

// Get all contact messages (Admin Only)
export const getContactMessages = async (req, res, next) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

// Toggle resolve status of a contact message (Admin Only)
export const updateContactMessageStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contact = await ContactMessage.findById(id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    contact.isResolved = !contact.isResolved;
    await contact.save();
    res.status(200).json({ 
      success: true, 
      message: `Inquiry status updated to ${contact.isResolved ? 'Resolved' : 'Pending'}.`, 
      data: contact 
    });
  } catch (error) {
    next(error);
  }
};
