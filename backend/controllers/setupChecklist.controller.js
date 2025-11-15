import SetupTask from '../models/SetupTask.js';
import { ensureSetupChecklist, DEFAULT_SETUP_GROUPS, syncSetupChecklistStatuses } from '../services/setupChecklist.js';

const mapTasksToGroups = (tasks) => {
  const groups = {};
  tasks.forEach((task) => {
    if (!groups[task.groupId]) {
      const fallback = DEFAULT_SETUP_GROUPS.find((group) => group.id === task.groupId);
      groups[task.groupId] = {
        id: task.groupId,
        title: task.groupTitle || fallback?.title || task.groupId,
        order: task.groupOrder || fallback?.order || 0,
        tasks: []
      };
    }
    groups[task.groupId].tasks.push(task);
  });

  return Object.values(groups)
    .sort((a, b) => a.order - b.order)
    .map((group) => ({
      ...group,
      tasks: group.tasks.sort((a, b) => a.order - b.order)
    }));
};

export const getSetupChecklist = async (req, res) => {
  try {
    await ensureSetupChecklist(req.organizationId);
    await syncSetupChecklistStatuses(req.organizationId);

    const tasks = await SetupTask.find({ organizationId: req.organizationId })
      .sort({ groupOrder: 1, order: 1 })
      .lean();

    const grouped = mapTasksToGroups(tasks);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.status === 'completed').length;

    res.json({
      success: true,
      data: {
        groups: grouped,
        metrics: {
          totalTasks,
          completedTasks,
          completionPercent: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSetupTaskStatus = async (req, res) => {
  try {
    const { taskKey } = req.params;
    const { status } = req.body;

    if (!['pending', 'in-progress', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const task = await SetupTask.findOne({
      organizationId: req.organizationId,
      key: taskKey
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date();
      task.completedBy = req.user._id;
    } else {
      task.completedAt = undefined;
      task.completedBy = undefined;
    }

    await task.save();

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


