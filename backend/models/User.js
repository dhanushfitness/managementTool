import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
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
  role: {
    type: String,
    enum: ['owner', 'manager', 'staff', 'accountant'],
    required: true,
    default: 'staff'
  },
  permissions: [{
    type: String
  }],
  profilePicture: String,
  countryCode: {
    type: String,
    default: '+91'
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  dateOfBirth: Date,
  anniversary: Date,
  vaccinated: {
    type: String,
    enum: ['yes', 'no']
  },
  loginAccess: {
    type: Boolean,
    default: true
  },
  resume: {
    name: String,
    url: String,
    uploadedAt: Date
  },
  employeeType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'intern']
  },
  category: {
    type: String,
    enum: ['trainer', 'receptionist', 'manager', 'accountant', 'maintenance', 'other']
  },
  payoutType: {
    type: String,
    enum: ['fixed', 'commission', 'hourly', 'mixed']
  },
  grade: String,
  salary: Number,
  jobDesignation: {
    type: String,
    required: false
  },
  adminRights: {
    type: String,
    enum: ['none', 'limited', 'full'],
    default: 'none'
  },
  dateOfJoining: Date,
  attendanceId: String,
  panCard: String,
  gstNumber: String,
  bankAccount: {
    accountNumber: String,
    ifsc: String,
    bankName: String
  },
  hrmsId: String,
  employmentStatus: {
    type: String,
    enum: ['active', 'inactive', 'terminated'],
    default: 'active'
  },
  shiftSchedule: {
    monday: [{ start: String, end: String }],
    tuesday: [{ start: String, end: String }],
    wednesday: [{ start: String, end: String }],
    thursday: [{ start: String, end: String }],
    friday: [{ start: String, end: String }],
    saturday: [{ start: String, end: String }],
    sunday: [{ start: String, end: String }]
  },
  // Super Admin Profile fields
  rfidCard: String,
  defaultTimezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  defaultOpenPage: {
    type: String,
    enum: ['snapshot', 'follow-ups', 'calendar'],
    default: 'snapshot'
  },
  isSuperAdminStaff: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  phoneVerificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Indexes
userSchema.index({ organizationId: 1, email: 1 }, { unique: true });
userSchema.index({ organizationId: 1, phone: 1 });

const User = mongoose.model('User', userSchema);

export default User;

