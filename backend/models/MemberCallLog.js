import mongoose from 'mongoose';

const memberCallLogSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
    index: true
  },
  callType: {
    type: String,
    enum: [
      'welcome', 'induction', 'upgrade', 'courtesy', 'renewal', 'birthday', 'payment',
      'cross-sell', 'feedback', 'assessment', 'follow-up', 'other'
    ],
    required: true
  },
  calledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'missed', 'no-answer', 'busy', 'cancelled', 'contacted'],
    default: 'scheduled',
    index: true
  },
  notes: { type: String, maxlength: 2000 },
  scheduledAt: { type: Date },
  durationMinutes: { type: Number },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

memberCallLogSchema.index({ organizationId: 1, memberId: 1, createdAt: -1 });

const MemberCallLog = mongoose.model('MemberCallLog', memberCallLogSchema);

export default MemberCallLog;


