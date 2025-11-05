import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  offerType: {
    type: String,
    enum: ['discount', 'free-trial', 'package', 'referral', 'seasonal'],
    required: true
  },
  discountType: {
    type: String,
    enum: ['flat', 'percentage']
  },
  discountValue: Number,
  applicablePlans: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan'
  }],
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  termsAndConditions: String,
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  usageLimit: Number,
  usedCount: {
    type: Number,
    default: 0
  },
  targetAudience: {
    validity: String,
    gender: String,
    ageGroup: {
      min: Number,
      max: Number
    },
    leadSource: String,
    serviceCategory: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
offerSchema.index({ organizationId: 1, isActive: 1 });
offerSchema.index({ organizationId: 1, validFrom: 1, validUntil: 1 });

const Offer = mongoose.model('Offer', offerSchema);

export default Offer;

