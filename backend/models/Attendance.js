import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
    index: true
  },
  checkInTime: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  checkOutTime: Date,
  method: {
    type: String,
    enum: ['biometric', 'manual', 'qr', 'mobile'],
    required: true,
    default: 'manual'
  },
  deviceId: String,
  deviceName: String,
  status: {
    type: String,
    enum: ['success', 'blocked', 'expired', 'frozen', 'guest'],
    default: 'success'
  },
  blockedReason: String,
  checkedInBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  isOffline: {
    type: Boolean,
    default: false
  },
  synced: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
attendanceSchema.index({ organizationId: 1, checkInTime: -1 });
attendanceSchema.index({ memberId: 1, checkInTime: -1 });
attendanceSchema.index({ branchId: 1, checkInTime: -1 });
attendanceSchema.index({ checkInTime: -1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;

