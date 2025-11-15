import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
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
  slug: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true,
    default: 'membership'
  },
  accentColor: {
    type: String,
    trim: true,
    default: '#F97316'
  },
  icon: {
    type: String,
    trim: true,
    default: 'dumbbell'
  },
  isPromoted: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
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

serviceSchema.index({ organizationId: 1, slug: 1 }, { unique: true, sparse: true });
serviceSchema.index({ organizationId: 1, name: 1 }, { unique: true });

const Service = mongoose.model('Service', serviceSchema);

export default Service;


