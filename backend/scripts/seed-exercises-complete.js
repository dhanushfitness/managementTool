import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Exercise from '../models/Exercise.js';
import Organization from '../models/Organization.js';

dotenv.config();

// Helper function to get exercise image URL
const getExerciseImage = (exerciseName) => {
  const baseUrl = 'https://images.unsplash.com/photo-';
  const images = {
    'PUSH-UPS': '1571019613454-1cb2f99b2d8b?w=800',
    'BENCH-PRESS': '1517836357463-d25dfeac3438?w=800',
    'CHEST-PRESS': '1517836357463-d25dfeac3438?w=800',
    'FLAT DB-PRESS': '1517836357463-d25dfeac3438?w=800',
    'DECLINE-PRESS': '1517836357463-d25dfeac3438?w=800',
    'INCLINE-PRESS': '1517836357463-d25dfeac3438?w=800',
    'PEC-FLY': '1517836357463-d25dfeac3438?w=800',
    'CABLE-CROSS': '1517836357463-d25dfeac3438?w=800',
    'DB-PULLOVER': '1517836357463-d25dfeac3438?w=800',
  };
  return images[exerciseName] ? `${baseUrl}${images[exerciseName]}` : `${baseUrl}1517836357463-d25dfeac3438?w=800`;
};

// Helper function to get exercise video URL
const getExerciseVideo = (exerciseName) => {
  const videos = {
    'PUSH-UPS': 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    'BENCH-PRESS': 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
    'DEAD-LIFT': 'https://www.youtube.com/watch?v=op9kVnSso6Q',
  };
  return videos[exerciseName] || 'https://www.youtube.com/watch?v=IODxDxX7oi4';
};

// Exercise data with variations, images, and videos
const exercises = [
  // CHEST EXERCISES (9 exercises)
  {
    name: 'PUSH-UPS',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'beginner',
    description: 'Classic bodyweight exercise targeting chest, shoulders, and triceps',
    sets: 3,
    reps: '10-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('PUSH-UPS'),
    videoUrl: getExerciseVideo('PUSH-UPS'),
    variations: [
      { name: 'Standard Push-ups', sets: 3, reps: '10-15', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },
  {
    name: 'BENCH-PRESS',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'intermediate',
    description: 'Compound exercise for chest, shoulders, and triceps using barbell',
    sets: 4,
    reps: '8-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('BENCH-PRESS'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Flat Bench Press', sets: 4, reps: '8-12', weight: '60-80% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'CHEST-PRESS',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'beginner',
    description: 'Machine chest press for beginners',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('CHEST-PRESS'),
    videoUrl: getExerciseVideo('CHEST-PRESS'),
    variations: [
      { name: 'Machine Chest Press', sets: 3, reps: '10-12', weight: '40-80 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'FLAT DB-PRESS',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'intermediate',
    description: 'Dumbbell bench press for chest development',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('FLAT DB-PRESS'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Flat Dumbbell Press', sets: 3, reps: '10-12', weight: '25-50 lbs each', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'DECLINE-PRESS',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'intermediate',
    description: 'Targets lower chest muscles',
    sets: 3,
    reps: '8-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('DECLINE-PRESS'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Decline Barbell Press', sets: 3, reps: '8-12', weight: '60-80% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'INCLINE-PRESS',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'intermediate',
    description: 'Targets upper chest muscles',
    sets: 3,
    reps: '8-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('INCLINE-PRESS'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Incline Barbell Press', sets: 3, reps: '8-12', weight: '50-70% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'PEC-FLY',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'beginner',
    description: 'Isolation exercise for chest muscles',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('PEC-FLY'),
    videoUrl: getExerciseVideo('PEC-FLY'),
    variations: [
      { name: 'Cable Flyes', sets: 3, reps: '12-15', weight: '20-40 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'CABLE-CROSS',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'intermediate',
    description: 'Cable crossover for chest isolation',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('CABLE-CROSS'),
    videoUrl: getExerciseVideo('CABLE-CROSS'),
    variations: [
      { name: 'Cable Crossover', sets: 3, reps: '12-15', weight: '20-40 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'DB-PULLOVER',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'intermediate',
    description: 'Dumbbell pullover for chest and lats',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('DB-PULLOVER'),
    videoUrl: getExerciseVideo('DB-PULLOVER'),
    variations: [
      { name: 'Dumbbell Pullover', sets: 3, reps: '10-12', weight: '20-40 lbs', difficulty: 'intermediate' }
    ]
  },

  // BACK EXERCISES (10 exercises)
  {
    name: 'ALT BACK EXT',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'beginner',
    description: 'Alternating back extension',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('ALT BACK EXT'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Alternating Back Extension', sets: 3, reps: '12-15', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },
  {
    name: 'LAT PULL DOWN',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'intermediate',
    description: 'Lat pulldown for upper back',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('LAT PULL DOWN'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Wide Grip Pulldown', sets: 3, reps: '10-12', weight: '60-100 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'VERTICAL ROW',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'intermediate',
    description: 'Vertical row for back muscles',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('VERTICAL ROW'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Vertical Row', sets: 3, reps: '10-12', weight: '50-80 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'SINGLE HAND DB ROW',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'intermediate',
    description: 'Single arm dumbbell row',
    sets: 3,
    reps: '10-12 each',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('SINGLE HAND DB ROW'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Single Arm DB Row', sets: 3, reps: '10-12 each', weight: '25-50 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'SEATED BACK ROW',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'beginner',
    description: 'Machine row for back muscles',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('SEATED BACK ROW'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Seated Cable Row', sets: 3, reps: '10-12', weight: '50-80 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'BENT OVER ROW',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'intermediate',
    description: 'Targets middle back and lats',
    sets: 4,
    reps: '8-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('BENT OVER ROW'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Barbell Row', sets: 4, reps: '8-12', weight: '60-80% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'DB OVER ROW',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'intermediate',
    description: 'Dumbbell over row',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('DB OVER ROW'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Dumbbell Over Row', sets: 3, reps: '10-12', weight: '25-50 lbs each', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'DEAD-LIFT',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'advanced',
    description: 'Compound exercise targeting entire posterior chain',
    sets: 4,
    reps: '5-8',
    restTime: '120 seconds',
    imageUrl: getExerciseImage('DEAD-LIFT'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Conventional Deadlift', sets: 4, reps: '5-8', weight: '80-100% 1RM', difficulty: 'advanced' }
    ]
  },
  {
    name: 'BACK EXT',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'beginner',
    description: 'Back extension for lower back',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('BACK EXT'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Back Extension', sets: 3, reps: '12-15', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },
  {
    name: 'HYPER EXT',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'beginner',
    description: 'Hyperextension for lower back',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('HYPER EXT'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Hyperextension', sets: 3, reps: '12-15', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },

  // SHOULDER EXERCISES (10 exercises)
  {
    name: 'OVER HEAD PRESS',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'intermediate',
    description: 'Overhead press for shoulders',
    sets: 4,
    reps: '8-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('OVER HEAD PRESS'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Overhead Press', sets: 4, reps: '8-12', weight: '60-80% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'MILITARY PRESS',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'intermediate',
    description: 'Military press for shoulders',
    sets: 4,
    reps: '8-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('MILITARY PRESS'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Military Press', sets: 4, reps: '8-12', weight: '60-80% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'SEATED DB PRESS',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'intermediate',
    description: 'Seated dumbbell press for shoulders',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('SEATED DB PRESS'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Seated DB Press', sets: 3, reps: '10-12', weight: '20-40 lbs each', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'BEND OVER LATERAL RAISES',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'intermediate',
    description: 'Bent over lateral raises for rear delts',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('BEND OVER LATERAL RAISES'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Bent Over Lateral Raises', sets: 3, reps: '12-15', weight: '10-20 lbs each', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'DB ALT FRONT RAISE',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'beginner',
    description: 'Alternating dumbbell front raise',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('DB ALT FRONT RAISE'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Alternating Front Raise', sets: 3, reps: '12-15', weight: '5-15 lbs each', difficulty: 'beginner' }
    ]
  },
  {
    name: 'EXTERNAL CABLE ROTATION',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'beginner',
    description: 'External cable rotation for rotator cuff',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('EXTERNAL CABLE ROTATION'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'External Cable Rotation', sets: 3, reps: '12-15', weight: '5-15 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'DB SHRUGS',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'beginner',
    description: 'Dumbbell shrugs for traps',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('DB SHRUGS'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Dumbbell Shrugs', sets: 3, reps: '12-15', weight: '30-60 lbs each', difficulty: 'beginner' }
    ]
  },
  {
    name: 'UPRIGHT ROWS',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'intermediate',
    description: 'Upright rows for shoulders',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('UPRIGHT ROWS'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Upright Rows', sets: 3, reps: '10-12', weight: '40-60 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'DB LATERAL RAISE',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'beginner',
    description: 'Dumbbell lateral raise for side delts',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('DB LATERAL RAISE'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Lateral Raise', sets: 3, reps: '12-15', weight: '10-20 lbs each', difficulty: 'beginner' }
    ]
  },
  {
    name: 'REVERSE FLYS REARDELT',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'intermediate',
    description: 'Reverse flys for rear delts',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('REVERSE FLYS REARDELT'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Reverse Flys', sets: 3, reps: '12-15', weight: '10-20 lbs each', difficulty: 'intermediate' }
    ]
  },

  // LOWER BODY EXERCISES (13 exercises)
  {
    name: 'ABDUCTOR',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Hip abductor machine',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('ABDUCTOR'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Hip Abductor', sets: 3, reps: '12-15', weight: '30-60 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'SMITH SQUAT',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'intermediate',
    description: 'Smith machine squat',
    sets: 4,
    reps: '8-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('SMITH SQUAT'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Smith Squat', sets: 4, reps: '8-12', weight: '60-80% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'LEG PRESS',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Leg press machine',
    sets: 3,
    reps: '12-15',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('LEG PRESS'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Leg Press', sets: 3, reps: '12-15', weight: '100-200 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'LUNGES',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'intermediate',
    description: 'Lunges for legs',
    sets: 3,
    reps: '10-12 each leg',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('LUNGES'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Walking Lunges', sets: 3, reps: '10-12 each leg', weight: 'bodyweight or 20-40 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'BULGARIAN SPLIT SQUAT',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'intermediate',
    description: 'Bulgarian split squat',
    sets: 3,
    reps: '10-12 each leg',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('BULGARIAN SPLIT SQUAT'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Bulgarian Split Squat', sets: 3, reps: '10-12 each leg', weight: 'bodyweight or 20-40 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'SINGLE LEG DEAD LIFT',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'intermediate',
    description: 'Single leg deadlift',
    sets: 3,
    reps: '10-12 each leg',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('SINGLE LEG DEAD LIFT'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Single Leg Deadlift', sets: 3, reps: '10-12 each leg', weight: '20-40 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'LEG EXTENSION',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Leg extension machine',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('LEG EXTENSION'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Leg Extension', sets: 3, reps: '12-15', weight: '40-80 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'SEATED LEG CURL',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Seated leg curl machine',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('SEATED LEG CURL'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Seated Leg Curl', sets: 3, reps: '12-15', weight: '40-80 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'DB STEPUPS',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'intermediate',
    description: 'Dumbbell step-ups',
    sets: 3,
    reps: '10-12 each leg',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('DB STEPUPS'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'DB Step-ups', sets: 3, reps: '10-12 each leg', weight: '20-40 lbs each', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'SWISS BALL SQUAT',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Swiss ball squat',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('SWISS BALL SQUAT'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Swiss Ball Squat', sets: 3, reps: '12-15', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },
  {
    name: 'FREE SQUATS',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'intermediate',
    description: 'Free weight squats',
    sets: 4,
    reps: '8-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('FREE SQUATS'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Free Squats', sets: 4, reps: '8-12', weight: '60-80% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'CALF RAISE',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Calf raise exercise',
    sets: 3,
    reps: '15-20',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('CALF RAISE'),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Standing Calf Raise', sets: 3, reps: '15-20', weight: 'bodyweight or 20-40 lbs', difficulty: 'beginner' }
    ]
  },

  // BICEPS EXERCISES (6 exercises)
  {
    name: 'BICEPS CABLE CURL',
    category: 'strength',
    muscleGroups: ['biceps'],
    difficulty: 'beginner',
    description: 'Cable bicep curl',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('BICEPS CABLE CURL'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Cable Bicep Curl', sets: 3, reps: '12-15', weight: '20-40 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'INCLINE DB CURL',
    category: 'strength',
    muscleGroups: ['biceps'],
    difficulty: 'intermediate',
    description: 'Incline dumbbell curl',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('INCLINE DB CURL'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Incline DB Curl', sets: 3, reps: '10-12', weight: '15-30 lbs each', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'STANDING BARBELL CURL',
    category: 'strength',
    muscleGroups: ['biceps'],
    difficulty: 'intermediate',
    description: 'Standing barbell curl',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('STANDING BARBELL CURL'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Standing Barbell Curl', sets: 3, reps: '10-12', weight: '40-60 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'DB CURL',
    category: 'strength',
    muscleGroups: ['biceps'],
    difficulty: 'beginner',
    description: 'Dumbbell curl',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('DB CURL'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Dumbbell Curl', sets: 3, reps: '12-15', weight: '15-30 lbs each', difficulty: 'beginner' }
    ]
  },
  {
    name: 'PREACHER CURL',
    category: 'strength',
    muscleGroups: ['biceps'],
    difficulty: 'intermediate',
    description: 'Preacher curl',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('PREACHER CURL'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Preacher Curl', sets: 3, reps: '10-12', weight: '30-50 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'HAMMER CURL',
    category: 'strength',
    muscleGroups: ['biceps'],
    difficulty: 'beginner',
    description: 'Hammer curl',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('HAMMER CURL'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Hammer Curl', sets: 3, reps: '12-15', weight: '15-30 lbs each', difficulty: 'beginner' }
    ]
  },

  // TRICEPS EXERCISES (5 exercises)
  {
    name: 'CABLE PUSH DOWN',
    category: 'strength',
    muscleGroups: ['triceps'],
    difficulty: 'beginner',
    description: 'Cable tricep pushdown',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('CABLE PUSH DOWN'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Cable Pushdown', sets: 3, reps: '12-15', weight: '20-40 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'SKULL CRUSHER',
    category: 'strength',
    muscleGroups: ['triceps'],
    difficulty: 'intermediate',
    description: 'Skull crusher for triceps',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('SKULL CRUSHER'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Skull Crusher', sets: 3, reps: '10-12', weight: '20-40 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'CLOSE GRIP PRESS',
    category: 'strength',
    muscleGroups: ['triceps'],
    difficulty: 'intermediate',
    description: 'Close grip bench press',
    sets: 3,
    reps: '8-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('CLOSE GRIP PRESS'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Close Grip Press', sets: 3, reps: '8-12', weight: '50-70% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'ONE ARM DB EXT',
    category: 'strength',
    muscleGroups: ['triceps'],
    difficulty: 'intermediate',
    description: 'Single arm tricep extension',
    sets: 3,
    reps: '10-12 each',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('ONE ARM DB EXT'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Single Arm Extension', sets: 3, reps: '10-12 each', weight: '10-20 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'DB OVERHEAD EXT',
    category: 'strength',
    muscleGroups: ['triceps'],
    difficulty: 'intermediate',
    description: 'Dumbbell overhead extension',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('DB OVERHEAD EXT'),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'DB Overhead Extension', sets: 3, reps: '10-12', weight: '20-40 lbs', difficulty: 'intermediate' }
    ]
  },

  // ABS EXERCISES (11 exercises)
  {
    name: 'PLANK',
    category: 'strength',
    muscleGroups: ['abs'],
    difficulty: 'beginner',
    description: 'Core strengthening exercise',
    sets: 3,
    reps: '30-60 seconds',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('PLANK'),
    videoUrl: getExerciseVideo('PUSH-UPS'),
    variations: [
      { name: 'Standard Plank', sets: 3, reps: '30-60 seconds', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },
  {
    name: 'OBLIQUE BRIDGE',
    category: 'strength',
    muscleGroups: ['abs'],
    difficulty: 'intermediate',
    description: 'Oblique bridge for side abs',
    sets: 3,
    reps: '30-45 seconds each side',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('OBLIQUE BRIDGE'),
    videoUrl: getExerciseVideo('PUSH-UPS'),
    variations: [
      { name: 'Oblique Bridge', sets: 3, reps: '30-45 seconds each side', weight: 'bodyweight', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'STRETCHING',
    category: 'flexibility',
    muscleGroups: ['abs'],
    difficulty: 'beginner',
    description: 'Stretching for core',
    sets: 1,
    reps: '30-60 seconds',
    restTime: '0',
    imageUrl: getExerciseImage('STRETCHING'),
    videoUrl: getExerciseVideo('PUSH-UPS'),
    variations: [
      { name: 'Core Stretching', sets: 1, reps: '30-60 seconds', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },
  {
    name: 'CRUNCHES',
    category: 'strength',
    muscleGroups: ['abs'],
    difficulty: 'beginner',
    description: 'Basic abdominal crunch',
    sets: 3,
    reps: '15-20',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('CRUNCHES'),
    videoUrl: getExerciseVideo('PUSH-UPS'),
    variations: [
      { name: 'Standard Crunches', sets: 3, reps: '15-20', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },
  {
    name: 'REVERSE CRUNCHES',
    category: 'strength',
    muscleGroups: ['abs'],
    difficulty: 'intermediate',
    description: 'Reverse crunch for lower abs',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('REVERSE CRUNCHES'),
    videoUrl: getExerciseVideo('PUSH-UPS'),
    variations: [
      { name: 'Reverse Crunch', sets: 3, reps: '12-15', weight: 'bodyweight', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'OBLIQUE CRUNCHES',
    category: 'strength',
    muscleGroups: ['abs'],
    difficulty: 'intermediate',
    description: 'Oblique crunches for side abs',
    sets: 3,
    reps: '12-15 each side',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('OBLIQUE CRUNCHES'),
    videoUrl: getExerciseVideo('PUSH-UPS'),
    variations: [
      { name: 'Oblique Crunches', sets: 3, reps: '12-15 each side', weight: 'bodyweight', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'BALL SIDES',
    category: 'strength',
    muscleGroups: ['abs'],
    difficulty: 'intermediate',
    description: 'Swiss ball side exercises',
    sets: 3,
    reps: '12-15 each side',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('BALL SIDES'),
    videoUrl: getExerciseVideo('PUSH-UPS'),
    variations: [
      { name: 'Ball Sides', sets: 3, reps: '12-15 each side', weight: 'bodyweight', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'RUSSIA TWIST',
    category: 'strength',
    muscleGroups: ['abs'],
    difficulty: 'intermediate',
    description: 'Russian twist for core',
    sets: 3,
    reps: '20-30',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('RUSSIA TWIST'),
    videoUrl: getExerciseVideo('PUSH-UPS'),
    variations: [
      { name: 'Russian Twist', sets: 3, reps: '20-30', weight: 'bodyweight or 10-20 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'AB LEG RAISES',
    category: 'strength',
    muscleGroups: ['abs'],
    difficulty: 'intermediate',
    description: 'Ab leg raises',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('AB LEG RAISES'),
    videoUrl: getExerciseVideo('PUSH-UPS'),
    variations: [
      { name: 'Leg Raises', sets: 3, reps: '12-15', weight: 'bodyweight', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'MOUNTAIN CLIMBER',
    category: 'strength',
    muscleGroups: ['abs'],
    difficulty: 'intermediate',
    description: 'Mountain climber for core',
    sets: 3,
    reps: '20-30 each leg',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('MOUNTAIN CLIMBER'),
    videoUrl: getExerciseVideo('PUSH-UPS'),
    variations: [
      { name: 'Mountain Climber', sets: 3, reps: '20-30 each leg', weight: 'bodyweight', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'SIDE TWISTER',
    category: 'strength',
    muscleGroups: ['abs'],
    difficulty: 'intermediate',
    description: 'Side twister for obliques',
    sets: 3,
    reps: '12-15 each side',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('SIDE TWISTER'),
    videoUrl: getExerciseVideo('PUSH-UPS'),
    variations: [
      { name: 'Side Twister', sets: 3, reps: '12-15 each side', weight: 'bodyweight', difficulty: 'intermediate' }
    ]
  },

  // CARDIO EXERCISES (5 exercises)
  {
    name: 'TREADMILL',
    category: 'cardio',
    muscleGroups: ['full-body'],
    difficulty: 'beginner',
    description: 'Treadmill running/walking',
    sets: 1,
    reps: '20-30 minutes',
    restTime: '0',
    duration: 20,
    distance: 3,
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    variations: [
      { name: 'Treadmill Walk', sets: 1, reps: '20-30 minutes', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },
  {
    name: 'ELLIPTICAL',
    category: 'cardio',
    muscleGroups: ['full-body'],
    difficulty: 'beginner',
    description: 'Elliptical machine cardio',
    sets: 1,
    reps: '20-30 minutes',
    restTime: '0',
    duration: 20,
    distance: 3,
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    variations: [
      { name: 'Elliptical Steady State', sets: 1, reps: '20-30 minutes', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },
  {
    name: 'RECUMBENT BIKE',
    category: 'cardio',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Recumbent bike cycling',
    sets: 1,
    reps: '20-30 minutes',
    restTime: '0',
    duration: 20,
    distance: 3,
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    variations: [
      { name: 'Recumbent Bike', sets: 1, reps: '20-30 minutes', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },
  {
    name: 'ROWING MACHINE',
    category: 'cardio',
    muscleGroups: ['full-body'],
    difficulty: 'intermediate',
    description: 'Rowing machine full body workout',
    sets: 1,
    reps: '15-20 minutes',
    restTime: '0',
    duration: 15,
    distance: 2.5,
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    variations: [
      { name: 'Rowing Steady', sets: 1, reps: '15-20 minutes', weight: 'bodyweight', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'UPRIGHT BIKE',
    category: 'cardio',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Upright stationary bike',
    sets: 1,
    reps: '20-30 minutes',
    restTime: '0',
    duration: 20,
    distance: 3,
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    variations: [
      { name: 'Upright Bike', sets: 1, reps: '20-30 minutes', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  }
];

async function seedExercises() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all organizations
    const organizations = await Organization.find({});
    
    if (organizations.length === 0) {
      console.log('No organizations found. Please create an organization first.');
      process.exit(1);
    }

    for (const org of organizations) {
      console.log(`\nSeeding exercises for organization: ${org.name}`);
      
      // Check if exercises already exist
      const existingExercises = await Exercise.find({ organizationId: org._id });
      const existingNames = new Set(existingExercises.map(ex => ex.name.toUpperCase()));
      
      if (existingExercises.length > 0) {
        console.log(`  Found ${existingExercises.length} existing exercises. Checking for missing ones...`);
        
        // Find exercises that don't exist yet
        const exercisesToCreate = exercises
          .filter(ex => !existingNames.has(ex.name.toUpperCase()))
          .map(ex => ({
            ...ex,
            organizationId: org._id,
            isActive: true
          }));

        if (exercisesToCreate.length > 0) {
          const created = await Exercise.insertMany(exercisesToCreate);
          console.log(`  Created ${created.length} new exercises with variations`);
        } else {
          console.log(`  All exercises already exist. No new exercises to add.`);
        }
      } else {
        // Create all exercises for this organization
        const exercisesToCreate = exercises.map(ex => ({
          ...ex,
          organizationId: org._id,
          isActive: true
        }));

        const created = await Exercise.insertMany(exercisesToCreate);
        console.log(`  Created ${created.length} exercises with variations`);
      }
    }

    console.log('\n✅ Exercise seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding exercises:', error);
    process.exit(1);
  }
}

seedExercises();

