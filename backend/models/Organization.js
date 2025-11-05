import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  logo: String,
  currency: {
    type: String,
    default: 'INR'
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  taxSettings: {
    gstNumber: String,
    taxRate: { type: Number, default: 0 },
    taxInclusive: { type: Boolean, default: false }
  },
  invoiceSettings: {
    prefix: { type: String, default: 'INV' },
    nextNumber: { type: Number, default: 1 },
    footer: String,
    terms: String
  },
  branding: {
    primaryColor: { type: String, default: '#10B981' },
    secondaryColor: String
  },
  razorpaySettings: {
    keyId: String,
    keySecret: String,
    isConnected: { type: Boolean, default: false },
    connectedAt: Date
  },
  whatsappSettings: {
    apiKey: String,
    apiSecret: String,
    phoneNumberId: String,
    isConnected: { type: Boolean, default: false },
    connectedAt: Date
  },
  onboardingStatus: {
    isCompleted: { type: Boolean, default: false },
    completedSteps: [String],
    completedAt: Date
  },
  subscription: {
    plan: { type: String, enum: ['free', 'basic', 'premium'], default: 'free' },
    status: { type: String, enum: ['active', 'trial', 'expired', 'cancelled'], default: 'trial' },
    startDate: Date,
    trialEndsAt: Date,
    expiresAt: Date
  },
  balances: {
    sms: {
      transactional: { type: Number, default: 0 },
      promotional: { type: Number, default: 0 }
    },
    mail: {
      free: { type: Number, default: 5000 },
      paid: { type: Number, default: 0 }
    }
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
organizationSchema.index({ email: 1 });
organizationSchema.index({ isActive: 1 });

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;

