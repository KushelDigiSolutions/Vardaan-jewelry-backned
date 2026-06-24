import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  isResolved: { type: Boolean, default: false }
}, { timestamps: true });

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
export default ContactMessage;
