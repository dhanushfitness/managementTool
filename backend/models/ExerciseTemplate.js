import mongoose from 'mongoose';

const exerciseTemplateSchema = new mongoose.Schema({
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
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'strength', 'cardio', 'flexibility', 'custom'],
    default: 'custom'
  },
  // Array of exercises with their day assignments
  exercises: [{
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true
    },
    weekDay: {
      type: Number, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      required: true,
      min: 0,
      max: 6
    },
    sets: Number,
    reps: String,
    weight: String,
    restTime: String,
    duration: Number,
    distance: Number,
    order: {
      type: Number,
      default: 0
    },
    notes: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean, // System default templates (can't be deleted)
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
exerciseTemplateSchema.index({ organizationId: 1, isActive: 1 });
exerciseTemplateSchema.index({ organizationId: 1, category: 1 });

const ExerciseTemplate = mongoose.model('ExerciseTemplate', exerciseTemplateSchema);

export default ExerciseTemplate;
