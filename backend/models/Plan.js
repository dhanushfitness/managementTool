import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  serviceName: {
    type: String,
    trim: true
  },
  serviceType: {
    type: String,
    trim: true,
    default: 'Membership'
  },
  variationId: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['duration', 'sessions', 'unlimited'],
    required: true,
    default: 'duration'
  },
  duration: {
    value: Number,
    unit: {
      type: String,
      enum: ['days', 'weeks', 'months', 'years']
    }
  },
  sessions: Number, // For session-based plans
  price: {
    type: Number,
    required: true,
    min: 0
  },
  setupFee: {
    type: Number,
    default: 0,
    min: 0
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  allowOnlineSale: {
    type: Boolean,
    default: false
  },
  features: [{
    name: String,
    included: { type: Boolean, default: true }
  }],
  addOns: [{
    name: String,
    price: Number,
    description: String
  }],
  freezeRules: {
    allowed: { type: Boolean, default: false },
    maxFreezeDays: Number,
    maxFreezeTimes: Number,
    freezeFee: { type: Number, default: 0 }
  },
  upgradeDowngradeRules: {
    allowUpgrade: { type: Boolean, default: true },
    allowDowngrade: { type: Boolean, default: true },
    prorationMethod: {
      type: String,
      enum: ['credit', 'extend'],
      default: 'credit'
    }
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  billingCycle: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly']
  },
  trialPeriod: {
    days: Number,
    price: Number
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
planSchema.index({ organizationId: 1, isActive: 1 });

const Plan = mongoose.model('Plan', planSchema);

export default Plan;

