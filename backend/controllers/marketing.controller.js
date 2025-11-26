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

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }

    // Get recipients based on module and filters
    const recipients = await getRecipients(module, filters, req.organizationId);

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'No recipients found matching the filters' });
    }

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

    // Send emails using email utility
    const { sendEmail: sendEmailUtil } = await import('../utils/email.js');
    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      if (recipient.email) {
        try {
          const recipientName = recipient.firstName 
            ? `${recipient.firstName} ${recipient.lastName || ''}`.trim() 
            : recipient.name || 'Member';
          
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2>${subject}</h2>
                </div>
                <div class="content">
                  <p>Dear ${recipientName},</p>
                  ${message.replace(/\n/g, '<br>')}
                  <div class="footer">
                    <p>Best regards,<br>Team</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          const result = await sendEmailUtil({
            to: recipient.email,
            subject,
            html: emailHtml
          });

          if (result.success) {
            successCount++;
            const rec = communication.recipients.find(r => r.email === recipient.email);
            if (rec) {
              rec.status = 'sent';
              rec.sentAt = new Date();
            }
          } else {
            failCount++;
            const rec = communication.recipients.find(r => r.email === recipient.email);
            if (rec) {
              rec.status = 'failed';
              rec.error = result.error;
            }
          }
        } catch (error) {
          failCount++;
          console.error(`Email send failed for ${recipient.email}:`, error);
        }
      }
    }

    communication.status = 'completed';
    communication.sentAt = new Date();
    communication.successfulSends = successCount;
    communication.failedSends = failCount;
    await communication.save();

    res.json({ 
      success: true, 
      communication,
      summary: {
        total: recipients.length,
        successful: successCount,
        failed: failCount
      }
    });
  } catch (error) {
    console.error('Send email error:', error);
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

    if (!customMessage) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const recipients = await getRecipients(module, filters, req.organizationId);

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'No recipients found matching the filters' });
    }

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

    // Send SMS - mark as completed (actual SMS integration would go here)
    let successCount = 0;
    for (const recipient of recipients) {
      if (recipient.phone) {
        const rec = communication.recipients.find(r => r.phone === recipient.phone);
        if (rec) {
          rec.status = 'sent';
          rec.sentAt = new Date();
          successCount++;
        }
      }
    }

    communication.status = 'completed';
    communication.sentAt = new Date();
    communication.successfulSends = successCount;
    await communication.save();

    res.json({ 
      success: true, 
      communication,
      summary: {
        total: recipients.length,
        successful: successCount,
        failed: 0
      }
    });
  } catch (error) {
    console.error('Send SMS error:', error);
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

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const recipients = await getRecipients(module, filters, req.organizationId);

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'No recipients found matching the filters' });
    }

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
    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      if (recipient.phone) {
        try {
          const recipientName = recipient.firstName 
            ? `${recipient.firstName} ${recipient.lastName || ''}`.trim() 
            : recipient.name || 'Member';
          
          // Try to send WhatsApp message
          await sendWhatsAppMessage(
            recipient.phone, 
            'marketing_message',
            [recipientName, message]
          );
          
          // Update recipient status
          const rec = communication.recipients.find(r => r.phone === recipient.phone);
          if (rec) {
            rec.status = 'sent';
            rec.sentAt = new Date();
            successCount++;
          }
        } catch (error) {
          failCount++;
          console.error('WhatsApp send failed:', error);
          const rec = communication.recipients.find(r => r.phone === recipient.phone);
          if (rec) {
            rec.status = 'failed';
            rec.error = error.message;
          }
        }
      }
    }

    communication.status = 'completed';
    communication.sentAt = new Date();
    communication.successfulSends = successCount;
    communication.failedSends = failCount;
    await communication.save();

    res.json({ 
      success: true, 
      communication,
      summary: {
        total: recipients.length,
        successful: successCount,
        failed: failCount
      }
    });
  } catch (error) {
    console.error('Send WhatsApp error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get filtered recipients (preview)
export const getFilteredRecipients = async (req, res) => {
  try {
    const { module, filters } = req.body;
    const recipients = await getRecipients(module, filters, req.organizationId);
    
    res.json({
      success: true,
      recipients,
      total: recipients.length
    });
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

    // Age Group filter
    if (filters.ageGroup) {
      const today = new Date();
      let minAge, maxAge;
      
      switch(filters.ageGroup) {
        case '18-25':
          minAge = 18;
          maxAge = 25;
          break;
        case '26-35':
          minAge = 26;
          maxAge = 35;
          break;
        case '36-45':
          minAge = 36;
          maxAge = 45;
          break;
        case '46-60':
          minAge = 46;
          maxAge = 60;
          break;
        case '60+':
          minAge = 60;
          maxAge = 120;
          break;
      }
      
      if (minAge && maxAge) {
        const minDate = new Date(today.getFullYear() - maxAge - 1, today.getMonth(), today.getDate());
        const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
        query.dateOfBirth = { $gte: minDate, $lte: maxDate };
      }
    }

    // Lead Source filter
    if (filters.leadSource) {
      query.source = filters.leadSource;
    }

    // Service Category filter
    if (filters.serviceCategory) {
      query['currentPlan.category'] = filters.serviceCategory;
    }

    // Service filter
    if (filters.service) {
      query['currentPlan.planId'] = filters.service;
    }

    // Service Variation filter
    if (filters.serviceVariation) {
      query['currentPlan.variation'] = filters.serviceVariation;
    }

    // Membership Expiry filter
    if (filters.membershipExpiryFrom || filters.membershipExpiryTo) {
      query['currentPlan.endDate'] = {};
      if (filters.membershipExpiryFrom) {
        const fromDate = new Date(filters.membershipExpiryFrom);
        fromDate.setHours(0, 0, 0, 0);
        query['currentPlan.endDate'].$gte = fromDate;
      }
      if (filters.membershipExpiryTo) {
        const toDate = new Date(filters.membershipExpiryTo);
        toDate.setHours(23, 59, 59, 999);
        query['currentPlan.endDate'].$lte = toDate;
      }
    }

    // Behaviour filter (could be implemented based on attendance, payments, etc.)
    if (filters.behaviour) {
      // Add logic for behavior-based filtering
      // For example: regular attendance, consistent payment, etc.
    }

    // Average Lifetime Value filter
    if (filters.avgLifetimeValue) {
      // Add logic for filtering by lifetime value
      // For example: query based on total payments made
    }

    return await Member.find(query).select('_id email phone firstName lastName memberId membershipStatus gender');
  } else if (module === 'enquiry') {
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

    return await Enquiry.find(query).select('_id email phone name enquiryStage leadSource');
  } else {
    // Suspect list - all enquiries
    return await Enquiry.find(query).select('_id email phone name enquiryStage leadSource');
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

