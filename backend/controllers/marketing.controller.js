import Communication from '../models/Communication.js';
import Offer from '../models/Offer.js';
import Member from '../models/Member.js';
import Enquiry from '../models/Enquiry.js';
import { sendWhatsAppMessage } from '../utils/whatsapp.js';
import AuditLog from '../models/AuditLog.js';

export const sendEmail = async (req, res) => {
  try {
    const {
      module,
      filters,
      templateId,
      subject,
      message,
      attachments,
      sendCopyToMe
    } = req.body;

    // Get recipients based on module and filters
    const recipients = await getRecipients(module, filters, req.organizationId);

    const communication = await Communication.create({
      organizationId: req.organizationId,
      type: 'email',
      module,
      subject,
      message,
      templateId,
      filters,
      attachments: attachments || [],
      sendCopyToMe,
      recipients: recipients.map(r => ({
        type: module === 'member' ? 'member' : 'enquiry',
        memberId: module === 'member' ? r._id : undefined,
        enquiryId: module !== 'member' ? r._id : undefined,
        email: r.email,
        phone: r.phone,
        status: 'pending'
      })),
      totalRecipients: recipients.length,
      status: 'sending',
      createdBy: req.user._id
    });

    // Send emails (implementation would go here)
    // For now, mark as completed
    communication.status = 'completed';
    communication.sentAt = new Date();
    communication.successfulSends = recipients.length;
    await communication.save();

    res.json({ success: true, communication });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendSMS = async (req, res) => {
  try {
    const {
      module,
      filters,
      gateway,
      templateId,
      customMessage
    } = req.body;

    const recipients = await getRecipients(module, filters, req.organizationId);

    const communication = await Communication.create({
      organizationId: req.organizationId,
      type: 'sms',
      module,
      gateway,
      templateId,
      message: customMessage,
      filters,
      recipients: recipients.map(r => ({
        type: module === 'member' ? 'member' : 'enquiry',
        memberId: module === 'member' ? r._id : undefined,
        enquiryId: module !== 'member' ? r._id : undefined,
        phone: r.phone,
        status: 'pending'
      })),
      totalRecipients: recipients.length,
      status: 'sending',
      createdBy: req.user._id
    });

    // Send SMS (implementation would go here)
    communication.status = 'completed';
    communication.sentAt = new Date();
    await communication.save();

    res.json({ success: true, communication });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendWhatsApp = async (req, res) => {
  try {
    const {
      module,
      filters,
      whatsappAccount,
      templateId,
      message
    } = req.body;

    const recipients = await getRecipients(module, filters, req.organizationId);

    const communication = await Communication.create({
      organizationId: req.organizationId,
      type: 'whatsapp',
      module,
      whatsappAccount,
      templateId,
      message,
      filters,
      recipients: recipients.map(r => ({
        type: module === 'member' ? 'member' : 'enquiry',
        memberId: module === 'member' ? r._id : undefined,
        enquiryId: module !== 'member' ? r._id : undefined,
        phone: r.phone,
        status: 'pending'
      })),
      totalRecipients: recipients.length,
      status: 'sending',
      createdBy: req.user._id
    });

    // Send WhatsApp messages
    for (const recipient of recipients) {
      if (recipient.phone) {
        try {
          await sendWhatsAppMessage(recipient.phone, templateId || 'default', []);
          // Update recipient status
          const rec = communication.recipients.find(r => r.phone === recipient.phone);
          if (rec) {
            rec.status = 'sent';
            rec.sentAt = new Date();
          }
        } catch (error) {
          console.error('WhatsApp send failed:', error);
        }
      }
    }

    communication.status = 'completed';
    communication.sentAt = new Date();
    await communication.save();

    res.json({ success: true, communication });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to get recipients based on filters
async function getRecipients(module, filters, organizationId) {
  let query = { organizationId };

  if (module === 'member') {
    // Member filters
    if (filters.validity === 'active') {
      query.membershipStatus = 'active';
    } else if (filters.validity === 'inactive') {
      query.membershipStatus = { $ne: 'active' };
    }

    if (filters.gender && filters.gender !== 'all') {
      query.gender = filters.gender;
    }

    if (filters.ageGroup) {
      // Calculate age from dateOfBirth
      const today = new Date();
      const minAge = filters.ageGroup.min;
      const maxAge = filters.ageGroup.max;
      const minDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
      const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
      query.dateOfBirth = { $gte: minDate, $lte: maxDate };
    }

    if (filters.leadSource) {
      query.source = filters.leadSource;
    }

    if (filters.service) {
      query['currentPlan.planId'] = filters.service;
    }

    if (filters.memberExpiry) {
      query['currentPlan.endDate'] = {
        $gte: filters.memberExpiry.from,
        $lte: filters.memberExpiry.to
      };
    }

    return await Member.find(query).select('_id email phone firstName lastName');
  } else {
    // Enquiry filters
    if (filters.validity === 'active') {
      query.enquiryStage = { $in: ['opened', 'qualified', 'demo', 'negotiation'] };
    } else if (filters.validity === 'inactive') {
      query.enquiryStage = { $in: ['lost', 'archived'] };
    }

    if (filters.gender && filters.gender !== 'all') {
      query.gender = filters.gender;
    }

    if (filters.leadSource) {
      query.leadSource = filters.leadSource;
    }

    if (filters.service) {
      query.service = filters.service;
    }

    return await Enquiry.find(query).select('_id email phone name');
  }
}

export const getCommunications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (page - 1) * limit;

    const query = { organizationId: req.organizationId };
    if (type) query.type = type;

    const communications = await Communication.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Communication.countDocuments(query);

    res.json({
      success: true,
      communications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOffer = async (req, res) => {
  try {
    const offer = await Offer.create({
      ...req.body,
      organizationId: req.organizationId,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOffers = async (req, res) => {
  try {
    const { isActive } = req.query;
    const query = { organizationId: req.organizationId };
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const offers = await Offer.find(query)
      .populate('applicablePlans', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findOne({
      _id: req.params.offerId,
      organizationId: req.organizationId
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    Object.assign(offer, req.body);
    await offer.save();

    res.json({ success: true, offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findOne({
      _id: req.params.offerId,
      organizationId: req.organizationId
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    await Offer.deleteOne({ _id: offer._id });

    res.json({ success: true, message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

