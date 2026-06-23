import ContactMessage from '../models/ContactMessage.js';

// Post a contact message (Public)
export const createContactMessage = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    const contact = await ContactMessage.create({
      name,
      email,
      subject,
      message
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
