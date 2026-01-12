import Exercise from '../models/Exercise.js';
import MemberExerciseAssignment from '../models/MemberExerciseAssignment.js';
import Member from '../models/Member.js';
import AuditLog from '../models/AuditLog.js';
import { handleError } from '../utils/errorHandler.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard exercise names from exerciseImageMap (must match frontend)
const STANDARD_EXERCISE_NAMES = [
  'PUSH-UPS', 'BENCH-PRESS', 'CHEST-PRESS', 'FLAT DB-PRESS', 'INCLINE DB-PRESS',
  'DECLINE DB-PRESS', 'DB-FLY', 'CABLE-CROSS', 'PEC-DECK', 'BENT-OVER-ROW',
  'DB-BENT-OVER-ROW', 'ONE-ARM-DB-ROW', 'LAT-PULLDOWN', 'PULL-UPS', 'T-BAR-ROW',
  'SEATED-ROW', 'DEAD-LIFT', 'ROMANIAN-DEADLIFT', 'HYPEREXTENSION', 'BACK-EXTENSION',
  'SHOULDER-PRESS', 'DB-SHOULDER-PRESS', 'LATERAL-RAISE', 'FRONT-RAISE', 'UPRIGHT-ROW',
  'SHRUGS', 'REAR-DELT-FLY', 'SQUATS', 'LEG-PRESS', 'LEG-EXTENSION', 'LEG-CURL',
  'LUNGES', 'BULGARIAN-SPLIT-SQUAT', 'CALF-RAISE', 'STEP-UPS', 'BICEP-CURL',
  'HAMMER-CURL', 'PREACHER-CURL', 'CABLE-CURL', 'CONCENTRATION-CURL', 'TRICEP-EXTENSION',
  'OVERHEAD-TRICEP', 'TRICEP-PUSHDOWN', 'CLOSE-GRIP-BENCH', 'SKULL-CRUSHERS', 'CRUNCHES',
  'SIT-UPS', 'PLANK', 'SIDE-PLANK', 'RUSSIAN-TWIST', 'MOUNTAIN-CLIMBER', 'LEG-RAISE',
  'TREADMILL', 'RUNNING', 'BIKE', 'CYCLE', 'ROWING', 'ELLIPTICAL'
];

// Normalize exercise name to match standard format
const normalizeExerciseName = (name) => {
  if (!name) return name;
  
  // Normalize: uppercase, remove special chars, replace spaces with hyphens
  const normalizeName = (n) => {
    return n.toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  };
  
  const normalized = normalizeName(name);
  
  // Check if it matches a standard name exactly
  if (STANDARD_EXERCISE_NAMES.includes(normalized)) {
    return normalized;
  }
  
  // Try to match with common variations
  const nameVariations = {
    'PUSH-UPS': ['PUSH-UPS', 'PUSH UPS', 'PUSHUP', 'PUSH-UPS', 'PUSHUP'],
    'BENCH-PRESS': ['BENCH-PRESS', 'BENCH PRESS', 'BENCHPRESS', 'BENCH PRESS'],
    'CHEST-PRESS': ['CHEST-PRESS', 'CHEST PRESS', 'CHESTPRESS'],
    'FLAT DB-PRESS': ['FLAT DB-PRESS', 'FLAT DB PRESS', 'FLAT DUMBBELL PRESS', 'FLAT-DB-PRESS'],
    'INCLINE DB-PRESS': ['INCLINE DB-PRESS', 'INCLINE DB PRESS', 'INCLINE DUMBBELL PRESS', 'INCLINE-DB-PRESS'],
    'DECLINE DB-PRESS': ['DECLINE DB-PRESS', 'DECLINE DB PRESS', 'DECLINE DUMBBELL PRESS', 'DECLINE-DB-PRESS'],
    'DB-FLY': ['DB-FLY', 'DB FLY', 'DUMBBELL FLY', 'DB-FLY', 'PEC-FLY'],
    'CABLE-CROSS': ['CABLE-CROSS', 'CABLE CROSS', 'CABLE CROSSOVER', 'CABLE-CROSSOVER'],
    'PEC-DECK': ['PEC-DECK', 'PEC DECK', 'PECDECK'],
    'BENT-OVER-ROW': ['BENT-OVER-ROW', 'BENT OVER ROW', 'BENTOVERROW'],
    'DB-BENT-OVER-ROW': ['DB-BENT-OVER-ROW', 'DB BENT OVER ROW', 'DUMBBELL BENT OVER ROW', 'DB OVER ROW'],
    'ONE-ARM-DB-ROW': ['ONE-ARM-DB-ROW', 'ONE ARM DB ROW', 'ONE ARM DUMBBELL ROW', 'SINGLE HAND DB ROW'],
    'LAT-PULLDOWN': ['LAT-PULLDOWN', 'LAT PULLDOWN', 'LAT PULL DOWN', 'LATPULLDOWN'],
    'PULL-UPS': ['PULL-UPS', 'PULL UPS', 'PULLUP', 'PULL-UPS'],
    'T-BAR-ROW': ['T-BAR-ROW', 'T BAR ROW', 'TBARROW'],
    'SEATED-ROW': ['SEATED-ROW', 'SEATED ROW', 'SEATEDROW', 'SEATED BACK ROW'],
    'DEAD-LIFT': ['DEAD-LIFT', 'DEAD LIFT', 'DEADLIFT'],
    'ROMANIAN-DEADLIFT': ['ROMANIAN-DEADLIFT', 'ROMANIAN DEAD LIFT', 'ROMANIAN-DEAD-LIFT'],
    'HYPEREXTENSION': ['HYPEREXTENSION', 'HYPER EXTENSION', 'HYPER-EXTENSION', 'HYPER EXT'],
    'BACK-EXTENSION': ['BACK-EXTENSION', 'BACK EXTENSION', 'BACKEXTENSION', 'BACK EXT'],
    'SHOULDER-PRESS': ['SHOULDER-PRESS', 'SHOULDER PRESS', 'SHOULDERPRESS', 'OVER HEAD PRESS', 'MILITARY PRESS'],
    'DB-SHOULDER-PRESS': ['DB-SHOULDER-PRESS', 'DB SHOULDER PRESS', 'DUMBBELL SHOULDER PRESS', 'SEATED DB PRESS'],
    'LATERAL-RAISE': ['LATERAL-RAISE', 'LATERAL RAISE', 'LATERALRAISE', 'DB LATERAL RAISE'],
    'FRONT-RAISE': ['FRONT-RAISE', 'FRONT RAISE', 'FRONTRAISE', 'DB ALT FRONT RAISE'],
    'UPRIGHT-ROW': ['UPRIGHT-ROW', 'UPRIGHT ROW', 'UPRIGHTROW', 'UPRIGHT ROWS'],
    'SHRUGS': ['SHRUGS', 'SHRUG', 'DB SHRUGS'],
    'REAR-DELT-FLY': ['REAR-DELT-FLY', 'REAR DELT FLY', 'REAR DELTOID FLY', 'BEND OVER LATERAL RAISES', 'REVERSE FLYS REARDELT'],
    'SQUATS': ['SQUATS', 'SQUAT', 'FREE SQUATS'],
    'LEG-PRESS': ['LEG-PRESS', 'LEG PRESS', 'LEGPRESS'],
    'LEG-EXTENSION': ['LEG-EXTENSION', 'LEG EXTENSION', 'LEGEXTENSION'],
    'LEG-CURL': ['LEG-CURL', 'LEG CURL', 'LEGCURL', 'SEATED LEG CURL'],
    'LUNGES': ['LUNGES', 'LUNGE'],
    'BULGARIAN-SPLIT-SQUAT': ['BULGARIAN-SPLIT-SQUAT', 'BULGARIAN SPLIT SQUAT', 'BULGARIAN-SPLIT-SQUAT'],
    'CALF-RAISE': ['CALF-RAISE', 'CALF RAISE', 'CALFRAISE'],
    'STEP-UPS': ['STEP-UPS', 'STEP UPS', 'STEPUP', 'DB STEPUPS'],
    'BICEP-CURL': ['BICEP-CURL', 'BICEP CURL', 'BICEPS CURL', 'BICEPCURL', 'DB CURL'],
    'HAMMER-CURL': ['HAMMER-CURL', 'HAMMER CURL', 'HAMMERCURL'],
    'PREACHER-CURL': ['PREACHER-CURL', 'PREACHER CURL', 'PREACHERCURL'],
    'CABLE-CURL': ['CABLE-CURL', 'CABLE CURL', 'CABLECURL', 'BICEPS CABLE CURL'],
    'CONCENTRATION-CURL': ['CONCENTRATION-CURL', 'CONCENTRATION CURL', 'CONCENTRATIONCURL', 'INCLINE DB CURL'],
    'TRICEP-EXTENSION': ['TRICEP-EXTENSION', 'TRICEP EXTENSION', 'TRICEPS EXTENSION', 'ONE ARM DB EXT'],
    'OVERHEAD-TRICEP': ['OVERHEAD-TRICEP', 'OVERHEAD TRICEP', 'OVERHEAD TRICEPS', 'DB OVERHEAD EXT'],
    'TRICEP-PUSHDOWN': ['TRICEP-PUSHDOWN', 'TRICEP PUSHDOWN', 'TRICEPS PUSHDOWN', 'CABLE PUSH DOWN'],
    'CLOSE-GRIP-BENCH': ['CLOSE-GRIP-BENCH', 'CLOSE GRIP BENCH', 'CLOSE-GRIP-BENCH-PRESS', 'CLOSE GRIP PRESS'],
    'SKULL-CRUSHERS': ['SKULL-CRUSHERS', 'SKULL CRUSHERS', 'SKULLCRUSHERS', 'SKULL CRUSHER'],
    'CRUNCHES': ['CRUNCHES', 'CRUNCH'],
    'SIT-UPS': ['SIT-UPS', 'SIT UPS', 'SITUP'],
    'PLANK': ['PLANK'],
    'SIDE-PLANK': ['SIDE-PLANK', 'SIDE PLANK', 'SIDEPLANK'],
    'RUSSIAN-TWIST': ['RUSSIAN-TWIST', 'RUSSIAN TWIST', 'RUSSIANTWIST', 'RUSSIA TWIST'],
    'MOUNTAIN-CLIMBER': ['MOUNTAIN-CLIMBER', 'MOUNTAIN CLIMBER', 'MOUNTAINCLIMBER'],
    'LEG-RAISE': ['LEG-RAISE', 'LEG RAISE', 'LEGRAISE', 'AB LEG RAISES'],
    'TREADMILL': ['TREADMILL'],
    'RUNNING': ['RUNNING', 'RUN'],
    'BIKE': ['BIKE', 'BICYCLE', 'CYCLING', 'UPRIGHT BIKE'],
    'CYCLE': ['CYCLE', 'CYCLING', 'BIKE', 'RECUMBENT BIKE'],
    'ROWING': ['ROWING', 'ROW', 'ROWER', 'ROWING MACHINE'],
    'ELLIPTICAL': ['ELLIPTICAL', 'ELLIPTICAL MACHINE']
  };
  
  // Create reverse mapping from variations to standard keys
  const variationToKey = {};
  Object.entries(nameVariations).forEach(([key, variations]) => {
    variations.forEach(variation => {
      const normalizedVariation = normalizeName(variation);
      variationToKey[normalizedVariation] = key;
    });
  });
  
  // Try to find matching standard name
  if (variationToKey[normalized]) {
    return variationToKey[normalized];
  }
  
  // If no match found, return the normalized version (might be a new exercise)
  return normalized;
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/exercises');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

// Create exercise
export const createExercise = async (req, res) => {
  try {
    // Normalize exercise name to match standard format
    if (req.body.name) {
      req.body.name = normalizeExerciseName(req.body.name);
    }
    
    const exerciseData = {
      ...req.body,
      organizationId: req.organizationId,
      createdBy: req.user._id
    };

    // Handle file uploads
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        exerciseData.imageUrl = `/uploads/exercises/${req.files.image[0].filename}`;
      }
      if (req.files.video && req.files.video[0]) {
        exerciseData.videoUrl = `/uploads/exercises/${req.files.video[0].filename}`;
      }
    }

    const exercise = await Exercise.create(exerciseData);

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'exercise.created',
      entityType: 'Exercise',
      entityId: exercise._id
    });

    res.status(201).json({ success: true, exercise });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Get all exercises
export const getExercises = async (req, res) => {
  try {
    const { category, difficulty, search } = req.query;

    const query = {
      organizationId: req.organizationId,
      isActive: true
    };

    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Get all exercises without pagination
    const exercises = await Exercise.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      exercises
    });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Get single exercise
export const getExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findOne({
      _id: req.params.exerciseId,
      organizationId: req.organizationId
    }).populate('createdBy', 'firstName lastName');

    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Exercise not found' });
    }

    res.json({ success: true, exercise });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Update exercise
export const updateExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findOne({
      _id: req.params.exerciseId,
      organizationId: req.organizationId
    });

    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Exercise not found' });
    }

    // Normalize exercise name if it's being updated
    if (req.body.name) {
      req.body.name = normalizeExerciseName(req.body.name);
    }

    // Handle file uploads
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        // Delete old image if exists
        if (exercise.imageUrl) {
          const oldImagePath = path.join(__dirname, '..', exercise.imageUrl);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        req.body.imageUrl = `/uploads/exercises/${req.files.image[0].filename}`;
      }
      if (req.files.video && req.files.video[0]) {
        // Delete old video if exists
        if (exercise.videoUrl) {
          const oldVideoPath = path.join(__dirname, '..', exercise.videoUrl);
          if (fs.existsSync(oldVideoPath)) {
            fs.unlinkSync(oldVideoPath);
          }
        }
        req.body.videoUrl = `/uploads/exercises/${req.files.video[0].filename}`;
      }
    }

    Object.assign(exercise, req.body);
    await exercise.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'exercise.updated',
      entityType: 'Exercise',
      entityId: exercise._id
    });

    res.json({ success: true, exercise });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Delete exercise
export const deleteExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findOne({
      _id: req.params.exerciseId,
      organizationId: req.organizationId
    });

    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Exercise not found' });
    }

    // Delete associated files
    if (exercise.imageUrl) {
      const imagePath = path.join(__dirname, '..', exercise.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    if (exercise.videoUrl) {
      const videoPath = path.join(__dirname, '..', exercise.videoUrl);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }

    exercise.isActive = false;
    await exercise.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'exercise.deleted',
      entityType: 'Exercise',
      entityId: exercise._id
    });

    res.json({ success: true, message: 'Exercise deleted successfully' });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Assign exercise to member
export const assignExerciseToMember = async (req, res) => {
  try {
    const { memberId, exerciseId, weekDay, weekNumber, sets, reps, weight, restTime, order, notes, variationId, isRecurring, duration, distance, name, category, muscleGroups, description, imageUrl, videoUrl } = req.body;

    // Verify member exists
    const member = await Member.findOne({
      _id: memberId,
      organizationId: req.organizationId
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Find or create exercise
    let exercise;
    
    if (exerciseId) {
      exercise = await Exercise.findOne({
        _id: exerciseId,
        organizationId: req.organizationId
      });
    } else if (name) {
      // Try to find by name
      const normalizedName = normalizeExerciseName(name);
      exercise = await Exercise.findOne({
        name: normalizedName,
        organizationId: req.organizationId
      });
      
      // If not found, create it
      if (!exercise) {
        exercise = await Exercise.create({
          organizationId: req.organizationId,
          name: normalizedName,
          category: category || 'other',
          muscleGroups: muscleGroups || [],
          description: description,
          imageUrl: imageUrl, // Use the proper image URL
          videoUrl: videoUrl, // Add videoUrl here
          createdBy: req.user._id,
          isActive: true
        });
        
        // Log creation
        await AuditLog.create({
          organizationId: req.organizationId,
          userId: req.user._id,
          action: 'exercise.created_during_assignment',
          entityType: 'Exercise',
          entityId: exercise._id
        });
      }
    }

    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Exercise not found and could not be created' });
    }

    // If variationId is provided, verify it exists
    if (variationId && exercise.variations) {
      const variation = exercise.variations.find(v => v._id.toString() === variationId);
      if (!variation) {
        return res.status(404).json({ success: false, message: 'Exercise variation not found' });
      }
    }

    const assignment = await MemberExerciseAssignment.create({
      organizationId: req.organizationId,
      memberId,
      exerciseId: exercise._id,
      weekDay: parseInt(weekDay),
      weekNumber: weekNumber ? parseInt(weekNumber) : null, // null means repeats every week
      isRecurring: isRecurring !== undefined ? isRecurring : true, // Default to recurring
      variationId: variationId || null,
      sets: sets || null,
      reps: reps || null,
      weight: weight || null,
      restTime: restTime || null,
      duration: duration ? parseFloat(duration) : null,
      distance: distance ? parseFloat(distance) : null,
      order: parseInt(order) || 0,
      notes: notes || null,
      assignedBy: req.user._id
    });

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'exercise.assigned',
      entityType: 'MemberExerciseAssignment',
      entityId: assignment._id
    });

    const populatedAssignment = await MemberExerciseAssignment.findById(assignment._id)
      .populate('exerciseId')
      .populate('memberId', 'firstName lastName email');

    res.status(201).json({ success: true, assignment: populatedAssignment });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Get member's assigned exercises
export const getMemberExercises = async (req, res) => {
  try {
    const { weekDay, weekNumber } = req.query;
    
    // Get memberId from params (for admin route) or from authenticated member (for member route)
    const memberIdFromParams = req.params.memberId;
    const memberIdFromQuery = req.query.memberId;

    // If member is authenticated (memberAuth), use their ID
    // Otherwise, use the memberId from params or query (admin view)
    const targetMemberId = req.member?._id || memberIdFromParams || memberIdFromQuery;

    if (!targetMemberId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Member ID is required' 
      });
    }

    const query = {
      organizationId: req.organizationId,
      memberId: targetMemberId
    };

    if (weekDay !== undefined && weekDay !== null && weekDay !== '') {
      query.weekDay = parseInt(weekDay);
    }
    
    // For recurring exercises, we want to show them regardless of weekNumber
    // Only filter by weekNumber if it's explicitly provided and not null
    if (weekNumber !== undefined && weekNumber !== null && weekNumber !== '') {
      query.$or = [
        { weekNumber: parseInt(weekNumber) },
        { isRecurring: true, weekNumber: null },
        { isRecurring: true }
      ];
    } else {
      // If no weekNumber specified, show all recurring exercises
      query.$or = [
        { isRecurring: true },
        { weekNumber: null }
      ];
    }

    const assignments = await MemberExerciseAssignment.find(query)
      .populate('exerciseId')
      .populate('assignedBy', 'firstName lastName')
      .sort({ weekDay: 1, order: 1 });

    res.json({ success: true, assignments });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Update assignment
export const updateAssignment = async (req, res) => {
  try {
    const query = {
      _id: req.params.assignmentId,
      organizationId: req.organizationId
    };

    // If member is making the request, ensure they can only update their own assignments
    if (req.member) {
      query.memberId = req.member._id;
    }

    const assignment = await MemberExerciseAssignment.findOne(query)
      .populate('exerciseId');

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    // If member request, only allow updating progress fields
    if (req.member) {
      const { setsCompleted, repsCompleted } = req.body;
      
      // Validate setsCompleted
      if (setsCompleted !== undefined) {
        const maxSets = assignment.sets || assignment.exerciseId?.sets || 0;
        if (setsCompleted < 0 || setsCompleted > maxSets) {
          return res.status(400).json({ 
            success: false, 
            message: `Sets completed must be between 0 and ${maxSets}` 
          });
        }
        assignment.setsCompleted = setsCompleted;
      }

      // Validate repsCompleted
      if (repsCompleted !== undefined) {
        if (repsCompleted < 0) {
          return res.status(400).json({ 
            success: false, 
            message: 'Reps completed must be 0 or greater' 
          });
        }
        assignment.repsCompleted = repsCompleted;
      }

      // Auto-mark as completed if setsCompleted equals total sets
      const totalSets = assignment.sets || assignment.exerciseId?.sets || 0;
      if (assignment.setsCompleted >= totalSets && totalSets > 0 && !assignment.isCompleted) {
        assignment.isCompleted = true;
        assignment.completedAt = new Date();
      }
    } else {
      // Admin can update all fields
      Object.assign(assignment, req.body);
    }

    await assignment.save();

    const populatedAssignment = await MemberExerciseAssignment.findById(assignment._id)
      .populate('exerciseId')
      .populate('memberId', 'firstName lastName email');

    res.json({ success: true, assignment: populatedAssignment });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Delete assignment
export const deleteAssignment = async (req, res) => {
  try {
    const assignment = await MemberExerciseAssignment.findOne({
      _id: req.params.assignmentId,
      organizationId: req.organizationId
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    await MemberExerciseAssignment.deleteOne({ _id: assignment._id });

    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Mark exercise as completed
export const markExerciseCompleted = async (req, res) => {
  try {
    const assignment = await MemberExerciseAssignment.findOne({
      _id: req.params.assignmentId,
      organizationId: req.organizationId,
      memberId: req.member?._id
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    assignment.isCompleted = true;
    assignment.completedAt = new Date();
    await assignment.save();

    res.json({ success: true, assignment });
  } catch (error) {
    handleError(error, res, 500);
  }
};

// Get member progress analytics
export const getMemberProgress = async (req, res) => {
  try {
    const memberId = req.member?._id || req.params.memberId;
    const { period = 'week' } = req.query; // week, month, year

    if (!memberId) {
      return res.status(400).json({ success: false, message: 'Member ID is required' });
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
    }

    // Get all completed assignments in the period
    const completedAssignments = await MemberExerciseAssignment.find({
      organizationId: req.organizationId,
      memberId: memberId,
      isCompleted: true,
      completedAt: { $gte: startDate, $lte: now }
    })
      .populate('exerciseId', 'name category muscleGroups sets reps weight duration')
      .sort({ completedAt: -1 });

    // Calculate calories burned
    // Rough estimates: Cardio ~10 cal/min, Strength ~5 cal/min per set
    let totalCalories = 0;
    completedAssignments.forEach(assignment => {
      const exercise = assignment.exerciseId;
      if (!exercise) return;

      if (exercise.category === 'cardio') {
        const duration = assignment.duration || exercise.duration || 30;
        totalCalories += duration * 10; // ~10 calories per minute
      } else {
        const sets = assignment.setsCompleted || assignment.sets || exercise.sets || 3;
        totalCalories += sets * 5; // ~5 calories per set
      }
    });

    // Calculate muscle group distribution
    const muscleGroupCounts = {};
    completedAssignments.forEach(assignment => {
      const exercise = assignment.exerciseId;
      if (exercise && exercise.muscleGroups && Array.isArray(exercise.muscleGroups)) {
        exercise.muscleGroups.forEach(group => {
          muscleGroupCounts[group] = (muscleGroupCounts[group] || 0) + 1;
        });
      }
    });

    const totalMuscleGroupExercises = Object.values(muscleGroupCounts).reduce((a, b) => a + b, 0);
    const muscleGroupDistribution = Object.entries(muscleGroupCounts)
      .map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: totalMuscleGroupExercises > 0 ? Math.round((count / totalMuscleGroupExercises) * 100) : 0,
        count
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5

    // Calculate strength progress (weight progression over time)
    const strengthProgress = [];
    const weightData = completedAssignments
      .filter(a => a.weight && a.exerciseId && a.exerciseId.category === 'strength')
      .map(a => {
        const weightStr = a.weight.toString().replace(/[^0-9.]/g, '');
        return {
          date: a.completedAt,
          weight: parseFloat(weightStr) || 0,
          exerciseName: a.exerciseId.name
        };
      })
      .filter(a => a.weight > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group by week for strength progress
    const weeklyStrength = {};
    weightData.forEach(item => {
      const week = new Date(item.date);
      week.setHours(0, 0, 0, 0);
      week.setDate(week.getDate() - week.getDay()); // Start of week
      const weekKey = week.toISOString().split('T')[0];
      
      if (!weeklyStrength[weekKey]) {
        weeklyStrength[weekKey] = [];
      }
      weeklyStrength[weekKey].push(item.weight);
    });

    Object.entries(weeklyStrength).forEach(([week, weights]) => {
      const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
      strengthProgress.push({
        week: week,
        weight: Math.round(avgWeight)
      });
    });

    strengthProgress.sort((a, b) => new Date(a.week) - new Date(b.week));

    // Calculate calories burned per day (for chart)
    const dailyCalories = {};
    completedAssignments.forEach(assignment => {
      if (!assignment.completedAt) return;
      const date = new Date(assignment.completedAt).toISOString().split('T')[0];
      const exercise = assignment.exerciseId;
      
      let calories = 0;
      if (exercise) {
        if (exercise.category === 'cardio') {
          const duration = assignment.duration || exercise.duration || 30;
          calories = duration * 10;
        } else {
          const sets = assignment.setsCompleted || assignment.sets || exercise.sets || 3;
          calories = sets * 5;
        }
      }
      
      dailyCalories[date] = (dailyCalories[date] || 0) + calories;
    });

    // Get last 7 days of calories data
    const caloriesData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      caloriesData.push({
        date: dateStr,
        calories: Math.round(dailyCalories[dateStr] || 0)
      });
    }

    // Get completion stats
    const totalAssigned = await MemberExerciseAssignment.countDocuments({
      organizationId: req.organizationId,
      memberId: memberId
    });

    const totalCompleted = completedAssignments.length;
    const completionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

    // Recent activity (last 10 completed exercises)
    const recentActivity = completedAssignments.slice(0, 10).map(assignment => ({
      id: assignment._id,
      exerciseName: assignment.exerciseId?.name || 'Unknown',
      completedAt: assignment.completedAt,
      sets: assignment.setsCompleted || assignment.sets || 0,
      reps: assignment.repsCompleted || assignment.reps || 0
    }));

    res.json({
      success: true,
      progress: {
        period,
        totalCalories: Math.round(totalCalories),
        caloriesData,
        muscleGroupDistribution,
        strengthProgress,
        completionRate,
        totalCompleted,
        totalAssigned,
        recentActivity
      }
    });
  } catch (error) {
    handleError(error, res, 500);
  }
};

