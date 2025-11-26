import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  enquiryId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    index: true
  },
  email: String,
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan'
  },
  serviceName: String,
  leadSource: {
    type: String,
    enum: ['walk-in', 'referral', 'online', 'social-media', 'phone-call', 'other'],
    default: 'walk-in'
  },
  enquiryStage: {
    type: String,
    enum: ['opened', 'qualified', 'demo', 'negotiation', 'converted', 'lost', 'archived', 'enquiry', 'future-prospect', 'not-interested'],
    default: 'opened',
    index: true
  },
  enquiryType: {
    type: String,
    enum: ['new', 'follow-up', 'renewal', 'upgrade']
  },
  customerType: {
    type: String,
    enum: ['individual', 'corporate', 'group']
  },
  isMember: {
    type: Boolean,
    default: false
  },
  isLead: {
    type: Boolean,
    default: true
  },
  assignedStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  fitnessGoal: String,
  lastCallStatus: {
    type: String,
    enum: ['answered', 'missed', 'no-answer', 'busy', 'not-called', 'scheduled', 'enquiry', 'future-prospect', 'not-interested']
  },
  callTag: {
    type: String,
    enum: ['hot', 'warm', 'cold']
  },
  callLogs: [{
    date: Date,
    status: String,
    notes: String,
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  expectedClosureDate: Date,
  expectedAmount: {
    type: Number,
    default: 0
  },
  convertedToMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member'
  },
  convertedAt: Date,
  notes: String,
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  archivedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
enquirySchema.index({ organizationId: 1, enquiryStage: 1 });
enquirySchema.index({ organizationId: 1, date: -1 });
enquirySchema.index({ organizationId: 1, isArchived: 1 });
enquirySchema.index({ organizationId: 1, enquiryStage: 1, date: -1 });
enquirySchema.index({ organizationId: 1, date: -1, isArchived: 1 });

const Enquiry = mongoose.model('Enquiry', enquirySchema);

export default Enquiry;

