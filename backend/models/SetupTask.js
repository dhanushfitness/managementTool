import mongoose from 'mongoose';

const setupTaskSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  key: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  groupId: {
    type: String,
    required: true
  },
  groupTitle: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  groupOrder: {
    type: Number,
    default: 0
  },
  actionLabel: {
    type: String,
    trim: true
  },
  path: {
    type: String,
    trim: true
  },
  icon: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending'
  },
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

setupTaskSchema.index({ organizationId: 1, key: 1 }, { unique: true });

const SetupTask = mongoose.model('SetupTask', setupTaskSchema);

export default SetupTask;


