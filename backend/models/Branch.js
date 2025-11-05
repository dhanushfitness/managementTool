import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
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
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  // Business/Interest Group Profile
  country: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  locality: {
    type: String,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'INR'
  },
  region: String,
  
  // Branch Management
  timezone: {
    type: String,
    required: true,
    default: 'Asia/Kolkata'
  },
  businessType: {
    type: String,
    required: true
  },
  brandName: {
    type: String,
    required: true
  },
  countryCode: {
    type: String,
    default: '+91'
  },
  phone: String,
  email: String,
  latitude: {
    type: Number,
    default: 0
  },
  longitude: {
    type: Number,
    default: 0
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' },
    fullAddress: String // Required field for full address textarea
  },
  area: {
    type: Number, // Area in square feet
    default: 0
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  operatingHours: {
    monday: { 
      open: String, 
      close: String, 
      isClosed: { type: Boolean, default: false },
      breakStart: String,
      breakEnd: String
    },
    tuesday: { 
      open: String, 
      close: String, 
      isClosed: { type: Boolean, default: false },
      breakStart: String,
      breakEnd: String
    },
    wednesday: { 
      open: String, 
      close: String, 
      isClosed: { type: Boolean, default: false },
      breakStart: String,
      breakEnd: String
    },
    thursday: { 
      open: String, 
      close: String, 
      isClosed: { type: Boolean, default: false },
      breakStart: String,
      breakEnd: String
    },
    friday: { 
      open: String, 
      close: String, 
      isClosed: { type: Boolean, default: false },
      breakStart: String,
      breakEnd: String
    },
    saturday: { 
      open: String, 
      close: String, 
      isClosed: { type: Boolean, default: false },
      breakStart: String,
      breakEnd: String
    },
    sunday: { 
      open: String, 
      close: String, 
      isClosed: { type: Boolean, default: false },
      breakStart: String,
      breakEnd: String
    }
  },
  agreedToTerms: {
    type: Boolean,
    default: false
  },
  biometricDevices: [{
    deviceId: String,
    deviceName: String,
    model: String,
    status: { type: String, enum: ['active', 'inactive', 'offline'], default: 'inactive' },
    lastSeen: Date,
    registeredAt: Date
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for organization and branch code uniqueness
branchSchema.index({ organizationId: 1, code: 1 }, { unique: true });

const Branch = mongoose.model('Branch', branchSchema);

export default Branch;

