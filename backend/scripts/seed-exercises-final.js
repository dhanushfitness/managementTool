import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Exercise from '../models/Exercise.js';
import Organization from '../models/Organization.js';

dotenv.config();

// Complete exercise database with proper categorization and images
const EXERCISES_DATABASE = [
  // ==================== CHEST EXERCISES ====================
  {
    name: 'PUSH-UPS',
    category: 'strength',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    difficulty: 'beginner',
    description: 'Classic bodyweight exercise targeting chest, shoulders, and triceps',
    imageFileName: 'Push Ups.jpg',
    sets: 3,
    reps: '10-15',
    restTime: '60 seconds'
  },
  {
    name: 'BENCH-PRESS',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'intermediate',
    description: 'Compound exercise for chest development using barbell',
    imageFileName: 'flat dumbell press.jpg',
    sets: 4,
    reps: '8-12',
    restTime: '90 seconds'
  },
  {
    name: 'CHEST-PRESS',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'beginner',
    description: 'Machine chest press for controlled chest development',
    imageFileName: 'chest pres.jpg',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds'
  },
  {
    name: 'FLAT DB-PRESS',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'intermediate',
    description: 'Dumbbell bench press for balanced chest development',
    imageFileName: 'flat dumbell press.jpg',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds'
  },
  {
    name: 'INCLINE-PRESS',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'intermediate',
    description: 'Targets upper chest muscles',
    imageFileName: 'Incline Dumbbell Press.jpg',
    sets: 3,
    reps: '8-12',
    restTime: '90 seconds'
  },
  {
    name: 'DECLINE-PRESS',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'intermediate',
    description: 'Targets lower chest muscles',
    imageFileName: 'Dumbbell Decline Fly.jpg',
    sets: 3,
    reps: '8-12',
    restTime: '90 seconds'
  },
  {
    name: 'PEC-FLY',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'beginner',
    description: 'Isolation exercise for chest muscles',
    imageFileName: 'pec fly.jpg',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds'
  },
  {
    name: 'CABLE-CROSS',
    category: 'strength',
    muscleGroups: ['chest'],
    difficulty: 'intermediate',
    description: 'Cable crossover for chest isolation and definition',
    imageFileName: 'Cable Crossover.jpg',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds'
  },

  // ==================== BACK EXERCISES ====================
  {
    name: 'DEAD-LIFT',
    category: 'strength',
    muscleGroups: ['back', 'legs'],
    difficulty: 'advanced',
    description: 'Compound exercise targeting entire posterior chain',
    imageFileName: 'ROMANIAN DEADLIFT.jpg',
    sets: 4,
    reps: '5-8',
    restTime: '120 seconds'
  },
  {
    name: 'LAT PULL DOWN',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'intermediate',
    description: 'Lat pulldown for upper back development',
    imageFileName: 'Lat pull-down.jpg',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds'
  },
  {
    name: 'BENT OVER ROW',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'intermediate',
    description: 'Targets middle back and lats',
    imageFileName: 'Bent Over Row.jpg',
    sets: 4,
    reps: '8-12',
    restTime: '90 seconds'
  },
  {
    name: 'SINGLE HAND DB ROW',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'intermediate',
    description: 'Single arm dumbbell row for unilateral back development',
    imageFileName: 'Dumbbell One Arm Bent Over Row.jpg',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds'
  },
  {
    name: 'SEATED BACK ROW',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'beginner',
    description: 'Machine row for controlled back development',
    imageFileName: 'seated back row.jpg',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds'
  },
  {
    name: 'BACK EXT',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'beginner',
    description: 'Back extension for lower back strength',
    imageFileName: 'Back Extension.jpg',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds'
  },
  {
    name: 'HYPER EXT',
    category: 'strength',
    muscleGroups: ['back'],
    difficulty: 'beginner',
    description: 'Hyperextension for lower back and core',
    imageFileName: 'Hyperextension.jpg',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds'
  },

  // ==================== SHOULDER EXERCISES ====================
  {
    name: 'OVER HEAD PRESS',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'intermediate',
    description: 'Overhead press for complete shoulder development',
    imageFileName: 'Overhead Dumbbell Press.jpg',
    sets: 4,
    reps: '8-12',
    restTime: '90 seconds'
  },
  {
    name: 'SEATED DB PRESS',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'intermediate',
    description: 'Seated dumbbell press for controlled shoulder development',
    imageFileName: 'seated dumbell press.jpg',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds'
  },
  {
    name: 'DB LATERAL RAISE',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'beginner',
    description: 'Dumbbell lateral raise for side delts',
    imageFileName: 'Dumbbell Lateral Raise.jpg',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds'
  },
  {
    name: 'BEND OVER LATERAL RAISES',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'intermediate',
    description: 'Bent over lateral raises for rear delts',
    imageFileName: 'bend over lateral raise.jpg',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds'
  },
  {
    name: 'DB SHRUGS',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'beginner',
    description: 'Dumbbell shrugs for trap development',
    imageFileName: 'Dumbbell Shrug.jpg',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds'
  },
  {
    name: 'UPRIGHT ROWS',
    category: 'strength',
    muscleGroups: ['shoulders'],
    difficulty: 'intermediate',
    description: 'Upright rows for shoulders and traps',
    imageFileName: 'upright row.jpg',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds'
  },

  // ==================== LEG EXERCISES ====================
  {
    name: 'FREE SQUATS',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'intermediate',
    description: 'Free weight squats for complete leg development',
    imageFileName: 'free squats.jpg',
    sets: 4,
    reps: '8-12',
    restTime: '90 seconds'
  },
  {
    name: 'LEG PRESS',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Leg press machine for controlled leg development',
    imageFileName: 'leg press.jpg',
    sets: 3,
    reps: '12-15',
    restTime: '90 seconds'
  },
  {
    name: 'LEG EXTENSION',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Leg extension machine for quadriceps isolation',
    imageFileName: 'leg press.jpg',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds'
  },
  {
    name: 'SEATED LEG CURL',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Seated leg curl for hamstring development',
    imageFileName: 'seated leg curl.jpg',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds'
  },
  {
    name: 'LUNGES',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'intermediate',
    description: 'Walking lunges for leg strength and balance',
    imageFileName: 'Lunge With.jpg',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds'
  },
  {
    name: 'BULGARIAN SPLIT SQUAT',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'intermediate',
    description: 'Bulgarian split squat for unilateral leg strength',
    imageFileName: 'Bulgarian Split Squat.jpg',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds'
  },
  {
    name: 'CALF RAISE',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Standing calf raise for calf development',
    imageFileName: 'calf raises.jpg',
    sets: 3,
    reps: '15-20',
    restTime: '60 seconds'
  },
  {
    name: 'DB STEPUPS',
    category: 'strength',
    muscleGroups: ['legs'],
    difficulty: 'intermediate',
    description: 'Dumbbell step-ups for leg strength',
    imageFileName: 'Dumbbell Step Up.jpg',
    sets: 3,
    reps: '10-12',
    restTime: '90 seconds'
  },

  // ==================== BICEPS EXERCISES ====================
  {
    name: 'DB CURL',
    category: 'strength',
    muscleGroups: ['biceps'],
    difficulty: 'beginner',
    description: 'Dumbbell curl for bicep development',
    imageFileName: 'dumbell curl.jpg',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds'
  },
  {
    name: 'HAMMER CURL',
    category: 'strength',
    muscleGroups: ['biceps'],
    difficulty: 'beginner',
    description: 'Hammer curl for bicep and forearm development',
    imageFileName: 'Dumbbell Close Grip Curl.jpg',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds'
  },
  {
    name: 'PREACHER CURL',
    category: 'strength',
    muscleGroups: ['biceps'],
    difficulty: 'intermediate',
    description: 'Preacher curl for isolated bicep development',
    imageFileName: 'Preacher Curl.jpg',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds'
  },
  {
    name: 'BICEPS CABLE CURL',
    category: 'strength',
    muscleGroups: ['biceps'],
    difficulty: 'beginner',
    description: 'Cable bicep curl for constant tension',
    imageFileName: 'Biceps cable curl.jpg',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds'
  },

  // ==================== TRICEPS EXERCISES ====================
  {
    name: 'CABLE PUSH DOWN',
    category: 'strength',
    muscleGroups: ['triceps'],
    difficulty: 'beginner',
    description: 'Cable tricep pushdown for tricep isolation',
    imageFileName: 'Cable Tricep Pushdown.jpg',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds'
  },
  {
    name: 'SKULL CRUSHER',
    category: 'strength',
    muscleGroups: ['triceps'],
    difficulty: 'intermediate',
    description: 'Skull crusher for tricep mass',
    imageFileName: 'skull crusher.jpg',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds'
  },
  {
    name: 'CLOSE GRIP PRESS',
    category: 'strength',
    muscleGroups: ['triceps'],
    difficulty: 'intermediate',
    description: 'Close grip bench press for tricep strength',
    imageFileName: 'Barbell Close Grip Bench Press.jpg',
    sets: 3,
    reps: '8-12',
    restTime: '90 seconds'
  },
  {
    name: 'OVERHEAD TRICEP',
    category: 'strength',
    muscleGroups: ['triceps'],
    difficulty: 'intermediate',
    description: 'Overhead tricep extension for long head development',
    imageFileName: 'Dumbbell Seated Triceps Extension.jpg',
    sets: 3,
    reps: '10-12',
    restTime: '60 seconds'
  },

  // ==================== CORE/ABS EXERCISES ====================
  {
    name: 'CRUNCHES',
    category: 'strength',
    muscleGroups: ['abs', 'core'],
    difficulty: 'beginner',
    description: 'Basic crunches for ab development',
    imageFileName: 'crunches.jpg',
    sets: 3,
    reps: '15-20',
    restTime: '45 seconds'
  },
  {
    name: 'PLANK',
    category: 'strength',
    muscleGroups: ['core'],
    difficulty: 'beginner',
    description: 'Plank for core stability and strength',
    imageFileName: 'plank.jpg',
    sets: 3,
    reps: '30-60 sec',
    restTime: '60 seconds'
  },
  {
    name: 'SIDE-PLANK',
    category: 'strength',
    muscleGroups: ['core'],
    difficulty: 'intermediate',
    description: 'Side plank for oblique strength',
    imageFileName: 'Side Plank Oblique Crunch.jpg',
    sets: 3,
    reps: '30-45 sec',
    restTime: '60 seconds'
  },
  {
    name: 'RUSSIAN-TWIST',
    category: 'strength',
    muscleGroups: ['abs', 'core'],
    difficulty: 'intermediate',
    description: 'Russian twist for oblique development',
    imageFileName: 'Russian Twist.jpg',
    sets: 3,
    reps: '20-30',
    restTime: '45 seconds'
  },
  {
    name: 'MOUNTAIN-CLIMBER',
    category: 'cardio',
    muscleGroups: ['core', 'full-body'],
    difficulty: 'intermediate',
    description: 'Mountain climbers for cardio and core',
    imageFileName: 'Mountain Climber.jpg',
    sets: 3,
    reps: '20-30',
    restTime: '60 seconds'
  },
  {
    name: 'LEG-RAISE',
    category: 'strength',
    muscleGroups: ['abs'],
    difficulty: 'intermediate',
    description: 'Leg raises for lower ab development',
    imageFileName: 'abs leg raises.jpg',
    sets: 3,
    reps: '12-15',
    restTime: '60 seconds'
  },

  // ==================== CARDIO EXERCISES ====================
  {
    name: 'TREADMILL',
    category: 'cardio',
    muscleGroups: ['legs', 'full-body'],
    difficulty: 'beginner',
    description: 'Treadmill running or walking for cardio',
    imageFileName: 'Treadmill.jpg',
    sets: 1,
    reps: '20-30 min',
    restTime: '0'
  },
  {
    name: 'BIKE',
    category: 'cardio',
    muscleGroups: ['legs'],
    difficulty: 'beginner',
    description: 'Stationary bike for low-impact cardio',
    imageFileName: 'recumbent bike.jpg',
    sets: 1,
    reps: '20-30 min',
    restTime: '0'
  },
  {
    name: 'ROWING',
    category: 'cardio',
    muscleGroups: ['back', 'legs', 'full-body'],
    difficulty: 'intermediate',
    description: 'Rowing machine for full-body cardio',
    imageFileName: 'seated rowing.jpg',
    sets: 1,
    reps: '15-20 min',
    restTime: '0'
  },
  {
    name: 'ELLIPTICAL',
    category: 'cardio',
    muscleGroups: ['legs', 'full-body'],
    difficulty: 'beginner',
    description: 'Elliptical machine for low-impact cardio',
    imageFileName: 'elliptical.jpg',
    sets: 1,
    reps: '20-30 min',
    restTime: '0'
  }
];

const seedExercises = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all organizations
    const organizations = await Organization.find({});
    console.log(`Found ${organizations.length} organizations`);

    if (organizations.length === 0) {
      console.log('No organizations found!');
      process.exit(1);
    }

    for (const org of organizations) {
      console.log(`\n🏢 Processing organization: ${org.name}`);

      // Delete existing exercises for this organization
      const deleteResult = await Exercise.deleteMany({ organizationId: org._id });
      console.log(`✅ Deleted ${deleteResult.deletedCount} existing exercises`);

      // Create exercises for this organization
      const exercisesToCreate = EXERCISES_DATABASE.map(exercise => ({
        organizationId: org._id,
        name: exercise.name,
        category: exercise.category,
        muscleGroups: exercise.muscleGroups,
        difficulty: exercise.difficulty,
        description: exercise.description,
        imageUrl: `/exercises/${exercise.imageFileName}`, // Local path
        sets: exercise.sets,
        reps: exercise.reps,
        restTime: exercise.restTime,
        isActive: true
      }));

      const created = await Exercise.insertMany(exercisesToCreate);
      console.log(`✅ Created ${created.length} exercises`);
    }

    console.log('\n✨ Exercise seeding completed successfully!');
    console.log(`\n📝 Total exercises in database: ${EXERCISES_DATABASE.length}`);
    console.log('\n📋 Exercise breakdown:');
    console.log(`   - Chest: 8`);
    console.log(`   - Back: 7`);
    console.log(`   - Shoulders: 6`);
    console.log(`   - Legs: 8`);
    console.log(`   - Biceps: 4`);
    console.log(`   - Triceps: 4`);
    console.log(`   - Core/Abs: 6`);
    console.log(`   - Cardio: 4`);
    console.log(`\n💡 All exercises are now ready to use!`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding exercises:', error);
    process.exit(1);
  }
};

seedExercises();
