import mongoose from 'mongoose';

const followUpSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['follow-up', 'appointment', 'service-expiry', 'upgrade', 'client-birthday', 'staff-birthday'],
    required: true,
    index: true
  },
  callType: {
    type: String,
    enum: ['renewal-call', 'assessment-call', 'follow-up-call', 'enquiry-call', 'other'],
    default: 'follow-up-call'
  },
  callStatus: {
    type: String,
    enum: ['scheduled', 'attempted', 'contacted', 'not-contacted', 'missed'],
    default: 'scheduled',
    index: true
  },
  scheduledTime: {
    type: Date,
    index: true
  },
  attemptedAt: Date,
  contactedAt: Date,
  title: {
    type: String,
    required: true
  },
  description: String,
  relatedTo: {
    entityType: {
      type: String,
      enum: ['member', 'enquiry', 'staff'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: Date,
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
followUpSchema.index({ organizationId: 1, dueDate: 1 });
followUpSchema.index({ organizationId: 1, status: 1 });
followUpSchema.index({ organizationId: 1, type: 1 });

const FollowUp = mongoose.model('FollowUp', followUpSchema);

export default FollowUp;

