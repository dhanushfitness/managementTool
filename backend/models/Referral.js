import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({
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
  referralType: {
    type: String,
    enum: ['referred-by', 'referrer'],
    required: true,
    index: true
  },
  // For "referred-by": people this member referred
  // For "referrer": person who referred this member
  referredMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    index: true
  },
  // For external referrals (not yet members)
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  countryCode: {
    type: String,
    default: '+91'
  },
  phone: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'contacted', 'converted', 'declined'],
    default: 'pending'
  },
  convertedAt: Date,
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

referralSchema.index({ organizationId: 1, memberId: 1, referralType: 1 });
referralSchema.index({ organizationId: 1, memberId: 1, createdAt: -1 });

const Referral = mongoose.model('Referral', referralSchema);

export default Referral;

