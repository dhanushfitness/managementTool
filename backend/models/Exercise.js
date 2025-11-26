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
    enum: ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'abs', 'biceps', 'triceps', 'full-body', 'other']
  }],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  equipment: [{
    type: String
  }],
  instructions: [{
    step: Number,
    description: String
  }],
  // Default values (for backward compatibility)
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
  // Exercise variations (different ways to perform the same exercise)
  variations: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    sets: {
      type: Number,
      default: 3
    },
    reps: {
      type: String,
      default: '10'
    },
    weight: {
      type: String, // e.g., "10 kg", "bodyweight", "20-30 lbs"
      default: null
    },
    restTime: {
      type: String,
      default: '60 seconds'
    },
    imageUrl: String,
    videoUrl: String,
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    }
  }],
  imageUrl: String,
  videoUrl: String,
  duration: {
    type: Number, // in minutes
    default: 0
  },
  distance: {
    type: Number, // in kilometers or miles (depending on preference)
    default: 0
  },
  caloriesBurned: {
    type: Number,
    default: 0
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
exerciseSchema.index({ organizationId: 1, isActive: 1 });
exerciseSchema.index({ organizationId: 1, category: 1 });
exerciseSchema.index({ organizationId: 1, name: 1 });

const Exercise = mongoose.model('Exercise', exerciseSchema);

export default Exercise;

