import mongoose from 'mongoose';

const memberExerciseAssignmentSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
    index: true
  },
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
  weekNumber: {
    type: Number, // Week number in the program (1, 2, 3, etc.) - Optional, if null, repeats every week
    default: null
  },
  isRecurring: {
    type: Boolean, // If true, exercise repeats every week regardless of weekNumber
    default: true
  },
  variationId: {
    type: String, // ID of the exercise variation to use (if null, use default exercise values)
    default: null
  },
  sets: {
    type: Number,
    default: null // If null, use exercise default or variation default
  },
  reps: {
    type: String,
    default: null // If null, use exercise default or variation default
  },
  weight: {
    type: String, // Weight for this specific assignment
    default: null
  },
  restTime: {
    type: String,
    default: null // If null, use exercise default or variation default
  },
  duration: {
    type: Number, // Duration in minutes (for cardio exercises)
    default: null
  },
  distance: {
    type: Number, // Distance in kilometers (for cardio exercises)
    default: null
  },
  order: {
    type: Number, // Order of exercise in the day
    default: 0
  },
  notes: String,
  setsCompleted: {
    type: Number,
    default: 0
  },
  repsCompleted: {
    type: Number,
    default: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
memberExerciseAssignmentSchema.index({ memberId: 1, weekDay: 1, weekNumber: 1 });
memberExerciseAssignmentSchema.index({ memberId: 1, isCompleted: 1 });
memberExerciseAssignmentSchema.index({ memberId: 1, completedAt: 1 });
memberExerciseAssignmentSchema.index({ organizationId: 1, memberId: 1 });

const MemberExerciseAssignment = mongoose.model('MemberExerciseAssignment', memberExerciseAssignmentSchema);

export default MemberExerciseAssignment;

