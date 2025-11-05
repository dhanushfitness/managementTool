import mongoose from 'mongoose';

const communicationSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'whatsapp'],
    required: true
  },
  module: {
    type: String,
    enum: ['member', 'enquiry', 'suspect-list'],
    required: true
  },
  subject: String,
  message: String,
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template'
  },
  gateway: String, // For SMS
  whatsappAccount: String, // For WhatsApp
  filters: {
    validity: String,
    gender: String,
    ageGroup: {
      min: Number,
      max: Number
    },
    leadSource: String,
    serviceCategory: String,
    service: String,
    behaviour: String,
    memberExpiry: {
      from: Date,
      to: Date
    }
  },
  recipients: [{
    type: {
      type: String,
      enum: ['member', 'enquiry'],
      required: true
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member'
    },
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enquiry'
    },
    email: String,
    phone: String,
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending'
    },
    sentAt: Date,
    deliveredAt: Date,
    error: String
  }],
  attachments: [{
    name: String,
    url: String,
    size: Number
  }],
  sendCopyToMe: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'sending', 'completed', 'failed'],
    default: 'draft'
  },
  sentAt: Date,
  totalRecipients: Number,
  successfulSends: Number,
  failedSends: Number,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
communicationSchema.index({ organizationId: 1, type: 1 });
communicationSchema.index({ organizationId: 1, createdAt: -1 });

const Communication = mongoose.model('Communication', communicationSchema);

export default Communication;

