import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Exercise from '../models/Exercise.js';

dotenv.config();

// Mapping from old names to new standardized names (from exerciseImageMap)
const nameMapping = {
  'DECLINE-PRESS': 'DECLINE DB-PRESS',
  'INCLINE-PRESS': 'INCLINE DB-PRESS',
  'PEC-FLY': 'DB-FLY',
  'LAT PULL DOWN': 'LAT-PULLDOWN',
  'BENT OVER ROW': 'BENT-OVER-ROW',
  'DB OVER ROW': 'DB-BENT-OVER-ROW',
  'SINGLE HAND DB ROW': 'ONE-ARM-DB-ROW',
  'SEATED BACK ROW': 'SEATED-ROW',
  'BACK EXT': 'BACK-EXTENSION',
  'HYPER EXT': 'HYPEREXTENSION',
  'OVER HEAD PRESS': 'SHOULDER-PRESS',
  'MILITARY PRESS': 'SHOULDER-PRESS',
  'SEATED DB PRESS': 'DB-SHOULDER-PRESS',
  'BEND OVER LATERAL RAISES': 'REAR-DELT-FLY',
  'DB ALT FRONT RAISE': 'FRONT-RAISE',
  'DB SHRUGS': 'SHRUGS',
  'UPRIGHT ROWS': 'UPRIGHT-ROW',
  'DB LATERAL RAISE': 'LATERAL-RAISE',
  'REVERSE FLYS REARDELT': 'REAR-DELT-FLY',
  'LEG PRESS': 'LEG-PRESS',
  'BULGARIAN SPLIT SQUAT': 'BULGARIAN-SPLIT-SQUAT',
  'LEG EXTENSION': 'LEG-EXTENSION',
  'SEATED LEG CURL': 'LEG-CURL',
  'DB STEPUPS': 'STEP-UPS',
  'FREE SQUATS': 'SQUATS',
  'CALF RAISE': 'CALF-RAISE',
  'BICEPS CABLE CURL': 'CABLE-CURL',
  'INCLINE DB CURL': 'CONCENTRATION-CURL',
  'DB CURL': 'BICEP-CURL',
  'CABLE PUSH DOWN': 'TRICEP-PUSHDOWN',
  'SKULL CRUSHER': 'SKULL-CRUSHERS',
  'CLOSE GRIP PRESS': 'CLOSE-GRIP-BENCH',
  'ONE ARM DB EXT': 'TRICEP-EXTENSION',
  'DB OVERHEAD EXT': 'OVERHEAD-TRICEP',
  'RUSSIA TWIST': 'RUSSIAN-TWIST',
  'AB LEG RAISES': 'LEG-RAISE',
  'MOUNTAIN CLIMBER': 'MOUNTAIN-CLIMBER',
  'RECUMBENT BIKE': 'CYCLE',
  'ROWING MACHINE': 'ROWING',
  'UPRIGHT BIKE': 'BIKE',
};

async function normalizeExerciseNames() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    let updatedCount = 0;
    let skippedCount = 0;

    // Get all exercises
    const exercises = await Exercise.find({});
    console.log(`Found ${exercises.length} exercises to check`);

    for (const exercise of exercises) {
      const oldName = exercise.name;
      const normalizedName = oldName.toUpperCase().trim();
      
      // Check if this exercise name needs to be updated
      let newName = null;
      
      // First, try exact match
      if (nameMapping[normalizedName]) {
        newName = nameMapping[normalizedName];
      } else {
        // Try case-insensitive match
        for (const [old, newVal] of Object.entries(nameMapping)) {
          if (normalizedName === old.toUpperCase()) {
            newName = newVal;
            break;
          }
        }
      }

      if (newName && oldName !== newName) {
        // Check if an exercise with the new name already exists
        const existingExercise = await Exercise.findOne({
          _id: { $ne: exercise._id },
          organizationId: exercise.organizationId,
          name: newName
        });

        if (existingExercise) {
          console.log(`⚠️  Skipping "${oldName}" - exercise "${newName}" already exists`);
          skippedCount++;
        } else {
          exercise.name = newName;
          await exercise.save();
          console.log(`✅ Updated: "${oldName}" → "${newName}"`);
          updatedCount++;
        }
      }
    }

    console.log(`\n✅ Normalization complete!`);
    console.log(`   Updated: ${updatedCount} exercises`);
    console.log(`   Skipped: ${skippedCount} exercises (duplicates)`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error normalizing exercise names:', error);
    process.exit(1);
  }
}

normalizeExerciseNames();

