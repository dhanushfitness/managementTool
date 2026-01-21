import mongoose from 'mongoose';
import ExerciseTemplate from '../models/ExerciseTemplate.js';
import Exercise from '../models/Exercise.js';
import MemberExerciseAssignment from '../models/MemberExerciseAssignment.js';
import AuditLog from '../models/AuditLog.js';

// Create exercise template
export const createTemplate = async (req, res) => {
  try {
    const { name, description, category, exercises } = req.body;
    const organizationId = req.user.organizationId;
    const processedExercises = [];

    // Process exercises to ensure they exist in DB
    if (exercises && exercises.length > 0) {
      for (const ex of exercises) {
        let exerciseId = ex.exerciseId;

        // If no ID (static exercise), look up or create
        if (!exerciseId || !mongoose.Types.ObjectId.isValid(exerciseId)) {
           // Try to find by name
           const normalizedName = ex.name.trim(); // case-insensitive regex search could be better but name matching logic in assignExercise was exact or regex
           let existingExercise = await Exercise.findOne({
             organizationId,
             name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
             isActive: true
           });

           if (existingExercise) {
             exerciseId = existingExercise._id;
           } else {
             // Create new exercise
             const newExercise = await Exercise.create({
               organizationId,
               name: ex.name,
               category: ex.category || 'strength',
               muscleGroups: ex.muscleGroups || [],
               description: ex.description || '',
               imageUrl: ex.imageUrl || '',
               videoUrl: ex.videoUrl || '',
               createdBy: req.user._id
             });
             exerciseId = newExercise._id;
           }
        }

        // Add to processed list with verified ID
        processedExercises.push({
          exerciseId,
          weekDay: ex.weekDay,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          restTime: ex.restTime,
          duration: ex.duration,
          distance: ex.distance,
          order: ex.order,
          notes: ex.notes
        });
      }
    }

    const template = await ExerciseTemplate.create({
      organizationId,
      name,
      description,
      category,
      exercises: processedExercises,
      createdBy: req.user._id
    });

    // Log activity
    await AuditLog.create({
      organizationId,
      userId: req.user._id,
      action: 'create',
      resourceType: 'ExerciseTemplate',
      resourceId: template._id,
      entityType: 'ExerciseTemplate',
      entityId: template._id,
      details: { name }
    });

    res.status(201).json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all templates
export const getTemplates = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { category } = req.query;

    const filter = { organizationId, isActive: true };
    if (category) {
      filter.category = category;
    }

    const templates = await ExerciseTemplate.find(filter)
      .populate('exercises.exerciseId', 'name imageUrl category muscleGroups difficulty')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single template
export const getTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const organizationId = req.user.organizationId;

    const template = await ExerciseTemplate.findOne({
      _id: templateId,
      organizationId
    })
      .populate('exercises.exerciseId')
      .populate('createdBy', 'name email');

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update template
export const updateTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name, description, category, exercises } = req.body;
    const organizationId = req.user.organizationId;

    const template = await ExerciseTemplate.findOne({
      _id: templateId,
      organizationId
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Prevent modifying default templates
    if (template.isDefault) {
      return res.status(403).json({ message: 'Cannot modify default templates' });
    }

    // Validate exercises if provided
    // Process exercises if provided (handle static exercises)
    let processedExercises = undefined;
    if (exercises) {
      processedExercises = [];
      if (exercises.length > 0) {
        for (const ex of exercises) {
          let exerciseId = ex.exerciseId;
  
          // If no ID or invalid ID (static exercise), look up or create
          if (!exerciseId || !mongoose.Types.ObjectId.isValid(exerciseId)) {
             const normalizedName = ex.name ? ex.name.trim() : '';
             let existingExercise = null;
             
             if (normalizedName) {
               existingExercise = await Exercise.findOne({
                 organizationId,
                 name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
                 isActive: true
               });
             }
  
             if (existingExercise) {
               exerciseId = existingExercise._id;
             } else if (normalizedName) {
               const newExercise = await Exercise.create({
                 organizationId,
                 name: ex.name,
                 category: ex.category || 'strength',
                 muscleGroups: ex.muscleGroups || [],
                 description: ex.description || '',
                 imageUrl: ex.imageUrl || '',
                 videoUrl: ex.videoUrl || '',
                 createdBy: req.user._id
               });
               exerciseId = newExercise._id;
             }
          }
  
          if (exerciseId) {
            processedExercises.push({
              exerciseId,
              weekDay: ex.weekDay,
              sets: ex.sets,
              reps: ex.reps,
              weight: ex.weight,
              restTime: ex.restTime,
              duration: ex.duration,
              distance: ex.distance,
              order: ex.order,
              notes: ex.notes
            });
          }
        }
      }
    }

    // Update template
    if (name) template.name = name;
    if (description !== undefined) template.description = description;
    if (category) template.category = category;
    if (processedExercises !== undefined) template.exercises = processedExercises;

    await template.save();

    // Log activity
    await AuditLog.create({
      organizationId,
      userId: req.user._id,
      action: 'update',
      resourceType: 'ExerciseTemplate',
      resourceId: template._id,
      entityType: 'ExerciseTemplate',
      entityId: template._id,
      details: { name: template.name }
    });

    const updatedTemplate = await ExerciseTemplate.findById(template._id)
      .populate('exercises.exerciseId')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      template: updatedTemplate
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete template
export const deleteTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const organizationId = req.user.organizationId;

    const template = await ExerciseTemplate.findOne({
      _id: templateId,
      organizationId
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Prevent deleting default templates
    if (template.isDefault) {
      return res.status(403).json({ message: 'Cannot delete default templates' });
    }

    // Soft delete
    template.isActive = false;
    await template.save();

    // Log activity
    await AuditLog.create({
      organizationId,
      userId: req.user._id,
      action: 'delete',
      resourceType: 'ExerciseTemplate',
      resourceId: template._id,
      entityType: 'ExerciseTemplate',
      entityId: template._id,
      details: { name: template.name }
    });

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: error.message });
  }
};

// Assign template to member
export const assignTemplateToMember = async (req, res) => {
  try {
    const { templateId, memberId, startDate } = req.body;
    const organizationId = req.user.organizationId;

    // Get template
    const template = await ExerciseTemplate.findOne({
      _id: templateId,
      organizationId,
      isActive: true
    }).populate('exercises.exerciseId');

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (!template.exercises || template.exercises.length === 0) {
      return res.status(400).json({ message: 'Template has no exercises' });
    }

    // Note: We're adding exercises from the template to the member's existing workout plan
    // If you want to replace all exercises instead, uncomment the lines below:
    // await MemberExerciseAssignment.deleteMany({
    //   memberId,
    //   organizationId
    // });

    // Create assignments from template
    const assignments = template.exercises.map(ex => ({
      organizationId,
      memberId,
      exerciseId: ex.exerciseId._id,
      weekDay: ex.weekDay,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
      restTime: ex.restTime,
      duration: ex.duration,
      distance: ex.distance,
      order: ex.order || 0,
      notes: ex.notes,
      assignedBy: req.user._id
    }));

    const created = await MemberExerciseAssignment.insertMany(assignments);

    // Log activity
    await AuditLog.create({
      organizationId,
      userId: req.user._id,
      action: 'assign_template',
      resourceType: 'ExerciseTemplate',
      resourceId: template._id,
      entityType: 'Member',
      entityId: memberId,
      details: {
        templateName: template.name,
        memberId,
        exercisesCount: created.length
      }
    });

    res.status(201).json({
      success: true,
      message: `Template "${template.name}" assigned successfully`,
      assignmentsCreated: created.length
    });
  } catch (error) {
    console.error('Error assigning template:', error);
    res.status(500).json({ message: error.message });
  }
};

// Duplicate template
export const duplicateTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const organizationId = req.user.organizationId;

    const template = await ExerciseTemplate.findOne({
      _id: templateId,
      organizationId
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const duplicate = await ExerciseTemplate.create({
      organizationId,
      name: `${template.name} (Copy)`,
      description: template.description,
      category: template.category,
      exercises: template.exercises,
      createdBy: req.user._id
    });

    await AuditLog.create({
      organizationId,
      userId: req.user._id,
      action: 'duplicate',
      resourceType: 'ExerciseTemplate',
      resourceId: duplicate._id,
      entityType: 'ExerciseTemplate',
      entityId: duplicate._id,
      details: { originalId: template._id, name: duplicate.name }
    });

    const populatedDuplicate = await ExerciseTemplate.findById(duplicate._id)
      .populate('exercises.exerciseId')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      template: populatedDuplicate
    });
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({ message: error.message });
  }
};
