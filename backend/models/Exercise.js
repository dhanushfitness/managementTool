import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema({
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
    enum: ['cardio', 'strength', 'flexibility', 'balance', 'endurance', 'other'],
    default: 'other'
  },
  muscleGroups: [{
    type: String,
    enum: ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'abs', 'biceps', 'triceps', 'full-body', 'other', 'neck', 'glutes', 'calves', 'obliques', 'hamstrings', 'quads', 'groin', 'hips', 'rest', 'mind', 'warm-up', 'cool-down']
  }],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  // Simplified exercise parameters
  sets: {
    type: Number,
    default: 3
  },
  reps: {
    type: String, // Can be "10-12" or "30 seconds" etc.
    default: '10'
  },
  restTime: {
    type: String, // e.g., "60 seconds"
    default: '60 seconds'
  },
  imageUrl: String,
  videoUrl: String,
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
exerciseSchema.index({ organizationId: 1, isActive: 1 });
exerciseSchema.index({ organizationId: 1, category: 1 });
exerciseSchema.index({ organizationId: 1, name: 1 });
exerciseSchema.index({ organizationId: 1, muscleGroups: 1 });

const Exercise = mongoose.model('Exercise', exerciseSchema);

export default Exercise;

