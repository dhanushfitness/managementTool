import mongoose from 'mongoose';

const discountSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['flat', 'percentage'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  maxDiscount: Number, // For percentage discounts
  minPurchase: Number, // Minimum purchase amount
  applicablePlans: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan'
  }],
  usageLimit: {
    type: Number,
    default: null // null means unlimited
  },
  usedCount: {
    type: Number,
    default: 0
  },
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
discountSchema.index({ organizationId: 1, code: 1 }, { unique: true });
discountSchema.index({ organizationId: 1, isActive: 1, validFrom: 1, validUntil: 1 });

const Discount = mongoose.model('Discount', discountSchema);

export default Discount;

