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
    const { memberId, exerciseId, weekDay, weekNumber, sets, reps, weight, restTime, order, notes, variationId, isRecurring, duration, distance } = req.body;

    // Verify member exists
    const member = await Member.findOne({
      _id: memberId,
      organizationId: req.organizationId
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Verify exercise exists
    const exercise = await Exercise.findOne({
      _id: exerciseId,
      organizationId: req.organizationId
    });

    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Exercise not found' });
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
      exerciseId,
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
    const assignment = await MemberExerciseAssignment.findOne({
      _id: req.params.assignmentId,
      organizationId: req.organizationId
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    Object.assign(assignment, req.body);
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

