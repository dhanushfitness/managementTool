import mongoose from 'mongoose';

const staffTargetSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  targetType: {
    type: String,
    enum: ['sales', 'calls', 'appointments', 'conversions'],
    required: true
  },
  salesType: {
    type: String,
    enum: ['call-target', 'revenue-target', 'enquiry-target', 'conversion-target']
  },
  year: {
    type: Number,
    required: true
  },
  monthlyTargets: {
    january: { type: Number, default: 0 },
    february: { type: Number, default: 0 },
    march: { type: Number, default: 0 },
    april: { type: Number, default: 0 },
    may: { type: Number, default: 0 },
    june: { type: Number, default: 0 },
    july: { type: Number, default: 0 },
    august: { type: Number, default: 0 },
    september: { type: Number, default: 0 },
    october: { type: Number, default: 0 },
    november: { type: Number, default: 0 },
    december: { type: Number, default: 0 }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

staffTargetSchema.index({ organizationId: 1, staffId: 1, targetType: 1, year: 1 }, { unique: true });

const StaffTarget = mongoose.model('StaffTarget', staffTargetSchema);

export default StaffTarget;

