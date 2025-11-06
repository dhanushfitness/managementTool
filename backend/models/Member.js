import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },
  memberId: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    index: true
  },
  alternatePhone: String,
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  profilePicture: String,
  biometricData: {
    fingerprint: String,
    faceId: String,
    registeredAt: Date
  },
  emergencyContact: {
    name: String,
    countryCode: String,
    phone: String,
    relationship: String
  },
  customerType: {
    type: String,
    enum: ['individual', 'corporate', 'group']
  },
  salesRep: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  memberManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  mailerList: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MailerList'
  },
  generalTrainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  attendanceId: String,
  clubId: String,
  gstNo: String,
  communicationPreferences: {
    sms: { type: Boolean, default: true },
    mail: { type: Boolean, default: true },
    pushNotification: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: true }
  },
  fitnessProfile: {
    bodyWeight: Number,
    bmi: Number,
    fatPercentage: Number,
    visualFatPercentage: Number,
    bodyAge: Number,
    musclePercentage: Number,
    cardiovascularTestReport: String,
    muscleStrengthReport: String,
    muscleEndurance: Number,
    coreStrength: Number,
    flexibility: Number,
    height: Number,
    age: Number,
    gender: String,
    name: String,
    measuredAt: Date
  },
  membershipStatus: {
    type: String,
    enum: ['active', 'expired', 'frozen', 'cancelled', 'pending'],
    default: 'pending',
    index: true
  },
  currentPlan: {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan'
    },
    planName: String,
    startDate: Date,
    endDate: Date,
    sessions: {
      total: Number,
      used: { type: Number, default: 0 },
      remaining: Number
    }
  },
  subscription: {
    subscriptionId: String, // Razorpay subscription ID
    status: {
      type: String,
      enum: ['active', 'paused', 'cancelled', 'expired'],
      default: 'active'
    },
    nextBillingDate: Date,
    autoRenew: { type: Boolean, default: true }
  },
  freezeHistory: [{
    startDate: Date,
    endDate: Date,
    reason: String,
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: Date
  }],
  attendanceStats: {
    totalCheckIns: { type: Number, default: 0 },
    lastCheckIn: Date,
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    averageVisitsPerWeek: Number
  },
  notes: [{
    note: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now }
  }],
  documents: [{
    name: String,
    type: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  source: {
    type: String,
    enum: ['walk-in', 'referral', 'online', 'social-media', 'other'],
    default: 'walk-in'
  },
  tags: [String],
  termsAndConditions: {
    agreementDate: Date,
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    terms: String,
    conditions: String,
    specialNotes: String,
    lastUpdated: Date,
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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
memberSchema.index({ organizationId: 1, memberId: 1 }, { unique: true });
memberSchema.index({ organizationId: 1, phone: 1 });
memberSchema.index({ branchId: 1, membershipStatus: 1 });
memberSchema.index({ 'currentPlan.endDate': 1 });

const Member = mongoose.model('Member', memberSchema);

export default Member;

