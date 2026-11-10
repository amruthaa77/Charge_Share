import { Contact } from '../models/Contact.js';
import { sendEmail } from '../services/email.service.js';

export const submitContact = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message, consentGiven } = req.body;

    const contact = await Contact.create({
      name,
      email,
      phone: phone || '',
      subject,
      message,
      consentGiven,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
    });

    // Send automated acknowledgment email (non-blocking)
    sendEmail({
      to: email,
      subject: `Inquiry Received: [${subject}] - ChargeShare India`,
      html: `
        <h2 style="color: #0F172A; margin-top: 0;">We have received your message</h2>
        <p>Hello ${name},</p>
        <p>Thank you for reaching out to the ChargeShare India support & grievance desk. Your inquiry regarding <strong>${subject}</strong> has been logged under ticket reference #${contact._id.toString().slice(-6).toUpperCase()}.</p>
        <div style="background: #F1F5F9; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 13px;">
          <p style="margin: 0;"><em>"${message}"</em></p>
        </div>
        <p>Our Bengaluru support operations team will respond to your registered email address within <strong>24 to 48 hours</strong> (or within 7 business days for formal DPDP Act 2023 grievance filings).</p>
      `,
    }).catch((err) => console.error('Contact email receipt failed:', err.message));

    res.status(201).json({
      success: true,
      message: 'Your inquiry has been received. Our Bengaluru team will review and respond shortly.',
      ticketId: contact._id.toString().slice(-6).toUpperCase(),
    });
  } catch (error) {
    next(error);
  }
};

export const getContactMessages = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }

    const messages = await Contact.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

export const updateContactStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const message = await Contact.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      contactMessage: message,
    });
  } catch (error) {
    next(error);
  }
};
