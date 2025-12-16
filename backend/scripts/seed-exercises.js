import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Exercise from '../models/Exercise.js';
import Organization from '../models/Organization.js';

dotenv.config();

// Helper function to get exercise image URL from backend exercises folder
const getExerciseImage = (exerciseName, category, muscleGroups) => {
  // Base URL for backend exercises folder
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  
  // Map exercise names to image files in the exercises folder
  const exerciseImageMap = {
    'PUSH-UPS': 'Push Ups.jpg',
    'BENCH-PRESS': 'flat dumbell press.jpg',
    'CHEST-PRESS': 'chest pres.jpg',
    'FLAT-DB-PRESS': 'flat dumbell press.jpg',
    'INCLINE-DB-PRESS': 'Incline Dumbbell Press.jpg',
    'DECLINE-DB-PRESS': 'Dumbbell Decline Fly.jpg',
    'DB-FLY': 'pec fly.jpg',
    'CABLE-CROSS': 'Cable Crossover.jpg',
    'PEC-DECK': 'pec fly.jpg',
    'BENT-OVER-ROW': 'Bent Over Row.jpg',
    'DB-BENT-OVER-ROW': 'Dumbbell Bent Over Row.jpg',
    'ONE-ARM-DB-ROW': 'Dumbbell One Arm Bent Over Row.jpg',
    'LAT-PULLDOWN': 'Lat pull-down.jpg',
    'PULL-UPS': 'Lat pull-down.jpg',
    'T-BAR-ROW': 'Bent Over Row.jpg',
    'SEATED-ROW': 'seated back row.jpg',
    'DEAD-LIFT': 'ROMANIAN DEADLIFT.jpg',
    'ROMANIAN-DEADLIFT': 'ROMANIAN DEADLIFT.jpg',
    'HYPEREXTENSION': 'Hyperextension.jpg',
    'BACK-EXTENSION': 'Back Extension.jpg',
    'SHOULDER-PRESS': 'Overhead Dumbbell Press.jpg',
    'DB-SHOULDER-PRESS': 'seated dumbell press.jpg',
    'LATERAL-RAISE': 'Dumbbell Lateral Raise.jpg',
    'FRONT-RAISE': 'Dumbbell Lateral Raise.jpg',
    'UPRIGHT-ROW': 'upright row.jpg',
    'SHRUGS': 'Dumbbell Shrug.jpg',
    'REAR-DELT-FLY': 'bend over lateral raise.jpg',
    'SQUATS': 'free squats.jpg',
    'LEG-PRESS': 'leg press.jpg',
    'LEG-EXTENSION': 'leg press.jpg',
    'LEG-CURL': 'seated leg curl.jpg',
    'LUNGES': 'Lunge With.jpg',
    'BULGARIAN-SPLIT-SQUAT': 'Bulgarian Split Squat.jpg',
    'CALF-RAISE': 'calf raises.jpg',
    'STEP-UPS': 'Dumbbell Step Up.jpg',
    'BICEP-CURL': 'dumbell curl.jpg',
    'HAMMER-CURL': 'Dumbbell Close Grip Curl.jpg',
    'PREACHER-CURL': 'Preacher Curl.jpg',
    'CABLE-CURL': 'Biceps cable curl.jpg',
    'CONCENTRATION-CURL': 'Dumbbell Incline Biceps Curl.jpg',
    'TRICEP-EXTENSION': 'Dumbbell Standing Triceps Extension.jpg',
    'OVERHEAD-TRICEP': 'Dumbbell Seated Triceps Extension.jpg',
    'TRICEP-PUSHDOWN': 'Cable Tricep Pushdown.jpg',
    'CLOSE-GRIP-BENCH': 'Barbell Close Grip Bench Press.jpg',
    'SKULL-CRUSHERS': 'skull crusher.jpg',
    'CRUNCHES': 'crunches.jpg',
    'SIT-UPS': 'crunches.jpg',
    'PLANK': 'plank.jpg',
    'SIDE-PLANK': 'Side Plank Oblique Crunch.jpg',
    'RUSSIAN-TWIST': 'Russian Twist.jpg',
    'MOUNTAIN-CLIMBER': 'Mountain Climber.jpg',
    'LEG-RAISE': 'abs leg raises.jpg',
    'TREADMILL': 'Treadmill.jpg',
    'RUNNING': 'Treadmill.jpg',
    'BIKE': 'recumbent bike.jpg',
    'CYCLE': 'recumbent bike.jpg',
    'ROWING': 'seated rowing.jpg',
    'ELLIPTICAL': 'elliptical.jpg',
  };
  
  // Normalize exercise name for matching
  const normalizeName = (name) => {
    return name.toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  };
  
  const normalizedName = normalizeName(exerciseName);
  
  // Try to find exact match first
  if (exerciseImageMap[normalizedName]) {
    return `${baseUrl}/exercises/${exerciseImageMap[normalizedName]}`;
  }
  
  // Try partial matching
  for (const [key, imageFile] of Object.entries(exerciseImageMap)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return `${baseUrl}/exercises/${imageFile}`;
    }
  }
  
  // Fallback based on muscle groups
  if (muscleGroups && muscleGroups.length > 0) {
    const firstGroup = muscleGroups[0].toLowerCase();
    const fallbackImages = {
      chest: 'chest pres.jpg',
      back: 'Bent Over Row.jpg',
      shoulders: 'Dumbbell Lateral Raise.jpg',
      legs: 'Bulgarian Split Squat.jpg',
      biceps: 'Dumbbell Incline Biceps Curl.jpg',
      triceps: 'Dumbbell Standing Triceps Extension.jpg',
      abs: 'crunches.jpg',
    };
    
    if (fallbackImages[firstGroup]) {
      return `${baseUrl}/exercises/${fallbackImages[firstGroup]}`;
    }
  }
  
  // Final fallback
  return `${baseUrl}/exercises/Push Ups.jpg`;
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
    imageUrl: getExerciseImage('PUSH-UPS', 'strength', ['chest']),
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
    imageUrl: getExerciseImage('BENCH-PRESS', 'strength', ['chest']),
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
    imageUrl: getExerciseImage('CHEST-PRESS', 'strength', ['chest']),
    videoUrl: getExerciseVideo('CHEST-PRESS'),
    variations: [
      { name: 'Machine Chest Press', sets: 3, reps: '10-12', weight: '40-80 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'FLAT-DB-PRESS',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'intermediate',
    description: 'Dumbbell bench press for chest development',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('FLAT-DB-PRESS', 'strength', ['chest']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Flat Dumbbell Press', sets: 3, reps: '10-12', weight: '25-50 lbs each', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'DECLINE-DB-PRESS',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'intermediate',
    description: 'Targets lower chest muscles',
    sets: 3,
    reps: '8-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('DECLINE-DB-PRESS', 'strength', ['chest']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Decline Barbell Press', sets: 3, reps: '8-12', weight: '60-80% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'INCLINE-DB-PRESS',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'intermediate',
    description: 'Targets upper chest muscles',
    sets: 3,
    reps: '8-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('INCLINE-DB-PRESS', 'strength', ['chest']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Incline Barbell Press', sets: 3, reps: '8-12', weight: '50-70% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'DB-FLY',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'beginner',
    description: 'Isolation exercise for chest muscles',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('DB-FLY', 'strength', ['chest']),
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
    imageUrl: getExerciseImage('CABLE-CROSS', 'strength', ['chest']),
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
    imageUrl: getExerciseImage('DB-PULLOVER', 'strength', ['chest']),
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
    imageUrl: getExerciseImage('ALT BACK EXT', 'strength', ['back']),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Alternating Back Extension', sets: 3, reps: '12-15', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },
  {
    name: 'LAT-PULLDOWN',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'intermediate',
    description: 'Lat pulldown for upper back',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('LAT-PULLDOWN', 'strength', ['back']),
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
    imageUrl: getExerciseImage('VERTICAL ROW', 'strength', ['back']),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Vertical Row', sets: 3, reps: '10-12', weight: '50-80 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'ONE-ARM-DB-ROW',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'intermediate',
    description: 'Single arm dumbbell row',
    sets: 3,
    reps: '10-12 each',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('ONE-ARM-DB-ROW', 'strength', ['back']),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Single Arm DB Row', sets: 3, reps: '10-12 each', weight: '25-50 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'SEATED-ROW',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'beginner',
    description: 'Machine row for back muscles',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('SEATED-ROW', 'strength', ['back']),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Seated Cable Row', sets: 3, reps: '10-12', weight: '50-80 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'BENT-OVER-ROW',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'intermediate',
    description: 'Targets middle back and lats',
    sets: 4,
    reps: '8-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('BENT-OVER-ROW', 'strength', ['back']),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Barbell Row', sets: 4, reps: '8-12', weight: '60-80% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'DB-BENT-OVER-ROW',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'intermediate',
    description: 'Dumbbell over row',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('DB-BENT-OVER-ROW', 'strength', ['back']),
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
    imageUrl: getExerciseImage('DEAD-LIFT', 'strength', ['back']),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Conventional Deadlift', sets: 4, reps: '5-8', weight: '80-100% 1RM', difficulty: 'advanced' }
    ]
  },
  {
    name: 'BACK-EXTENSION',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'beginner',
    description: 'Back extension for lower back',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('BACK-EXTENSION', 'strength', ['back']),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Back Extension', sets: 3, reps: '12-15', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },
  {
    name: 'HYPEREXTENSION',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'beginner',
    description: 'Hyperextension for lower back',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('HYPEREXTENSION', 'strength', ['back']),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Hyperextension', sets: 3, reps: '12-15', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },

  // SHOULDER EXERCISES (10 exercises)
  {
    name: 'SHOULDER-PRESS',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'intermediate',
    description: 'Overhead press for shoulders',
    sets: 4,
    reps: '8-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('SHOULDER-PRESS', 'strength', ['shoulders']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Overhead Press', sets: 4, reps: '8-12', weight: '60-80% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'SHOULDER-PRESS',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'intermediate',
    description: 'Military press for shoulders',
    sets: 4,
    reps: '8-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('SHOULDER-PRESS', 'strength', ['shoulders']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Military Press', sets: 4, reps: '8-12', weight: '60-80% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'DB-SHOULDER-PRESS',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'intermediate',
    description: 'Seated dumbbell press for shoulders',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('DB-SHOULDER-PRESS', 'strength', ['shoulders']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Seated DB Press', sets: 3, reps: '10-12', weight: '20-40 lbs each', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'REAR-DELT-FLY',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'intermediate',
    description: 'Bent over lateral raises for rear delts',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('REAR-DELT-FLY', 'strength', ['shoulders']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Bent Over Lateral Raises', sets: 3, reps: '12-15', weight: '10-20 lbs each', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'FRONT-RAISE',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'beginner',
    description: 'Alternating dumbbell front raise',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('FRONT-RAISE', 'strength', ['shoulders']),
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
    imageUrl: getExerciseImage('EXTERNAL CABLE ROTATION', 'strength', ['shoulders']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'External Cable Rotation', sets: 3, reps: '12-15', weight: '5-15 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'SHRUGS',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'beginner',
    description: 'Dumbbell shrugs for traps',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('SHRUGS', 'strength', ['shoulders']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Dumbbell Shrugs', sets: 3, reps: '12-15', weight: '30-60 lbs each', difficulty: 'beginner' }
    ]
  },
  {
    name: 'UPRIGHT-ROW',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'intermediate',
    description: 'Upright rows for shoulders',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('UPRIGHT-ROW', 'strength', ['shoulders']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Upright Rows', sets: 3, reps: '10-12', weight: '40-60 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'LATERAL-RAISE',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'beginner',
    description: 'Dumbbell lateral raise for side delts',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('LATERAL-RAISE', 'strength', ['shoulders']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Lateral Raise', sets: 3, reps: '12-15', weight: '10-20 lbs each', difficulty: 'beginner' }
    ]
  },
  {
    name: 'REAR-DELT-FLY',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'intermediate',
    description: 'Reverse flys for rear delts',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('REAR-DELT-FLY', 'strength', ['shoulders']),
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
    imageUrl: getExerciseImage('ABDUCTOR', 'strength', ['legs']),
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
    imageUrl: getExerciseImage('SMITH SQUAT', 'strength', ['legs']),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Smith Squat', sets: 4, reps: '8-12', weight: '60-80% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'LEG-PRESS',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Leg press machine',
    sets: 3,
    reps: '12-15',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('LEG-PRESS', 'strength', ['legs']),
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
    imageUrl: getExerciseImage('LUNGES', 'strength', ['legs']),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Walking Lunges', sets: 3, reps: '10-12 each leg', weight: 'bodyweight or 20-40 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'BULGARIAN-SPLIT-SQUAT',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'intermediate',
    description: 'Bulgarian split squat',
    sets: 3,
    reps: '10-12 each leg',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('BULGARIAN-SPLIT-SQUAT', 'strength', ['legs']),
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
    imageUrl: getExerciseImage('SINGLE LEG DEAD LIFT', 'strength', ['legs']),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Single Leg Deadlift', sets: 3, reps: '10-12 each leg', weight: '20-40 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'LEG-EXTENSION',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Leg extension machine',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('LEG-EXTENSION', 'strength', ['legs']),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Leg Extension', sets: 3, reps: '12-15', weight: '40-80 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'LEG-CURL',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Seated leg curl machine',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('LEG-CURL', 'strength', ['legs']),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Seated Leg Curl', sets: 3, reps: '12-15', weight: '40-80 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'STEP-UPS',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'intermediate',
    description: 'Dumbbell step-ups',
    sets: 3,
    reps: '10-12 each leg',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('STEP-UPS', 'strength', ['legs']),
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
    imageUrl: getExerciseImage('SWISS BALL SQUAT', 'strength', ['legs']),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Swiss Ball Squat', sets: 3, reps: '12-15', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },
  {
    name: 'SQUATS',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'intermediate',
    description: 'Free weight squats',
    sets: 4,
    reps: '8-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('SQUATS', 'strength', ['legs']),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Free Squats', sets: 4, reps: '8-12', weight: '60-80% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'CALF-RAISE',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Calf raise exercise',
    sets: 3,
    reps: '15-20',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('CALF-RAISE', 'strength', ['legs']),
    videoUrl: getExerciseVideo('DEAD-LIFT'),
    variations: [
      { name: 'Standing Calf Raise', sets: 3, reps: '15-20', weight: 'bodyweight or 20-40 lbs', difficulty: 'beginner' }
    ]
  },

  // BICEPS EXERCISES (6 exercises)
  {
    name: 'CABLE-CURL',
    category: 'strength',
    muscleGroups: ['biceps'],
    difficulty: 'beginner',
    description: 'Cable bicep curl',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('CABLE-CURL', 'strength', ['biceps']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Cable Bicep Curl', sets: 3, reps: '12-15', weight: '20-40 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'CONCENTRATION-CURL',
    category: 'strength',
    muscleGroups: ['biceps'],
    difficulty: 'intermediate',
    description: 'Incline dumbbell curl',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('CONCENTRATION-CURL', 'strength', ['biceps']),
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
    imageUrl: getExerciseImage('STANDING BARBELL CURL', 'strength', ['biceps']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Standing Barbell Curl', sets: 3, reps: '10-12', weight: '40-60 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'BICEP-CURL',
    category: 'strength',
    muscleGroups: ['biceps'],
    difficulty: 'beginner',
    description: 'Dumbbell curl',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('BICEP-CURL', 'strength', ['biceps']),
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
    imageUrl: getExerciseImage('PREACHER CURL', 'strength', ['biceps']),
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
    imageUrl: getExerciseImage('HAMMER CURL', 'strength', ['biceps']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Hammer Curl', sets: 3, reps: '12-15', weight: '15-30 lbs each', difficulty: 'beginner' }
    ]
  },

  // TRICEPS EXERCISES (5 exercises)
  {
    name: 'TRICEP-PUSHDOWN',
    category: 'strength',
    muscleGroups: ['triceps'],
    difficulty: 'beginner',
    description: 'Cable tricep pushdown',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('TRICEP-PUSHDOWN', 'strength', ['triceps']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Cable Pushdown', sets: 3, reps: '12-15', weight: '20-40 lbs', difficulty: 'beginner' }
    ]
  },
  {
    name: 'SKULL-CRUSHERS',
    category: 'strength',
    muscleGroups: ['triceps'],
    difficulty: 'intermediate',
    description: 'Skull crusher for triceps',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('SKULL-CRUSHERS', 'strength', ['triceps']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Skull Crusher', sets: 3, reps: '10-12', weight: '20-40 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'CLOSE-GRIP-BENCH',
    category: 'strength',
    muscleGroups: ['triceps'],
    difficulty: 'intermediate',
    description: 'Close grip bench press',
    sets: 3,
    reps: '8-12',
    restTime: '90 seconds',
    imageUrl: getExerciseImage('CLOSE-GRIP-BENCH', 'strength', ['triceps']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Close Grip Press', sets: 3, reps: '8-12', weight: '50-70% 1RM', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'TRICEP-EXTENSION',
    category: 'strength',
    muscleGroups: ['triceps'],
    difficulty: 'intermediate',
    description: 'Single arm tricep extension',
    sets: 3,
    reps: '10-12 each',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('TRICEP-EXTENSION', 'strength', ['triceps']),
    videoUrl: getExerciseVideo('BENCH-PRESS'),
    variations: [
      { name: 'Single Arm Extension', sets: 3, reps: '10-12 each', weight: '10-20 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'OVERHEAD-TRICEP',
    category: 'strength',
    muscleGroups: ['triceps'],
    difficulty: 'intermediate',
    description: 'Dumbbell overhead extension',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('OVERHEAD-TRICEP', 'strength', ['triceps']),
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
    imageUrl: getExerciseImage('PLANK', 'strength', ['abs']),
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
    imageUrl: getExerciseImage('OBLIQUE BRIDGE', 'strength', ['abs']),
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
    imageUrl: getExerciseImage('STRETCHING', 'flexibility', ['abs']),
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
    imageUrl: getExerciseImage('CRUNCHES', 'strength', ['abs']),
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
    imageUrl: getExerciseImage('REVERSE CRUNCHES', 'strength', ['abs']),
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
    imageUrl: getExerciseImage('OBLIQUE CRUNCHES', 'strength', ['abs']),
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
    imageUrl: getExerciseImage('BALL SIDES', 'strength', ['abs']),
    videoUrl: getExerciseVideo('PUSH-UPS'),
    variations: [
      { name: 'Ball Sides', sets: 3, reps: '12-15 each side', weight: 'bodyweight', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'RUSSIAN-TWIST',
    category: 'strength',
    muscleGroups: ['abs'],
    difficulty: 'intermediate',
    description: 'Russian twist for core',
    sets: 3,
    reps: '20-30',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('RUSSIAN-TWIST', 'strength', ['abs']),
    videoUrl: getExerciseVideo('PUSH-UPS'),
    variations: [
      { name: 'Russian Twist', sets: 3, reps: '20-30', weight: 'bodyweight or 10-20 lbs', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'LEG-RAISE',
    category: 'strength',
    muscleGroups: ['abs'],
    difficulty: 'intermediate',
    description: 'Ab leg raises',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('LEG-RAISE', 'strength', ['abs']),
    videoUrl: getExerciseVideo('PUSH-UPS'),
    variations: [
      { name: 'Leg Raises', sets: 3, reps: '12-15', weight: 'bodyweight', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'MOUNTAIN-CLIMBER',
    category: 'strength',
    muscleGroups: ['abs'],
    difficulty: 'intermediate',
    description: 'Mountain climber for core',
    sets: 3,
    reps: '20-30 each leg',
    restTime: '60 seconds',
    imageUrl: getExerciseImage('MOUNTAIN-CLIMBER', 'strength', ['abs']),
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
    imageUrl: getExerciseImage('SIDE TWISTER', 'strength', ['abs']),
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
    imageUrl: getExerciseImage('TREADMILL', 'cardio', ['full-body']),
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
    imageUrl: getExerciseImage('ELLIPTICAL', 'cardio', ['full-body']),
    variations: [
      { name: 'Elliptical Steady State', sets: 1, reps: '20-30 minutes', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },
  {
    name: 'CYCLE',
    category: 'cardio',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Recumbent bike cycling',
    sets: 1,
    reps: '20-30 minutes',
    restTime: '0',
    duration: 20,
    distance: 3,
    imageUrl: getExerciseImage('CYCLE', 'cardio', ['legs']),
    variations: [
      { name: 'Recumbent Bike', sets: 1, reps: '20-30 minutes', weight: 'bodyweight', difficulty: 'beginner' }
    ]
  },
  {
    name: 'ROWING',
    category: 'cardio',
    muscleGroups: ['full-body'],
    difficulty: 'intermediate',
    description: 'Rowing machine full body workout',
    sets: 1,
    reps: '15-20 minutes',
    restTime: '0',
    duration: 15,
    distance: 2.5,
    imageUrl: getExerciseImage('ROWING', 'cardio', ['full-body']),
    variations: [
      { name: 'Rowing Steady', sets: 1, reps: '15-20 minutes', weight: 'bodyweight', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'BIKE',
    category: 'cardio',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Upright stationary bike',
    sets: 1,
    reps: '20-30 minutes',
    restTime: '0',
    duration: 20,
    distance: 3,
    imageUrl: getExerciseImage('BIKE', 'cardio', ['legs']),
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
        console.log(`  Found ${existingExercises.length} existing exercises. Checking for missing ones and updating images...`);
        
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
        
        // Update existing exercises to ensure they have imageUrl and videoUrl
        let updatedCount = 0
        for (const exerciseData of exercises) {
          const existingExercise = existingExercises.find(ex => ex.name.toUpperCase() === exerciseData.name.toUpperCase())
          if (existingExercise) {
            const updates = {}
            if (!existingExercise.imageUrl && exerciseData.imageUrl) {
              updates.imageUrl = exerciseData.imageUrl
            }
            if (!existingExercise.videoUrl && exerciseData.videoUrl) {
              updates.videoUrl = exerciseData.videoUrl
            }
            if (Object.keys(updates).length > 0) {
              await Exercise.updateOne({ _id: existingExercise._id }, { $set: updates })
              updatedCount++
            }
          }
        }
        if (updatedCount > 0) {
          console.log(`  Updated ${updatedCount} existing exercises with images/videos`);
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

