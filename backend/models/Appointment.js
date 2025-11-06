import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    index: true
  },
  enquiryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enquiry'
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  appointmentDate: {
    type: Date,
    required: true,
    index: true
  },
  appointmentTime: String,
  duration: Number, // in minutes
  type: {
    type: String,
    enum: ['consultation', 'assessment', 'follow-up', 'training', 'other'],
    default: 'consultation'
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled',
    index: true
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
appointmentSchema.index({ organizationId: 1, appointmentDate: 1 });
appointmentSchema.index({ memberId: 1, appointmentDate: 1 });
appointmentSchema.index({ staffId: 1, appointmentDate: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;

