import Plan from '../models/Plan.js';
import AuditLog from '../models/AuditLog.js';

export const createPlan = async (req, res) => {
  try {
    const planData = {
      ...req.body,
      organizationId: req.organizationId,
      createdBy: req.user._id
    };

    const plan = await Plan.create(planData);

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'plan.created',
      entityType: 'Plan',
      entityId: plan._id
    });

    res.status(201).json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPlans = async (req, res) => {
  try {
    const { isActive } = req.query;
    const query = { organizationId: req.organizationId };
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const plans = await Plan.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ displayOrder: 1, createdAt: -1 });

    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPlan = async (req, res) => {
  try {
    const plan = await Plan.findOne({
      _id: req.params.planId,
      organizationId: req.organizationId
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findOne({
      _id: req.params.planId,
      organizationId: req.organizationId
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    Object.assign(plan, req.body);
    await plan.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'plan.updated',
      entityType: 'Plan',
      entityId: plan._id
    });

    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findOne({
      _id: req.params.planId,
      organizationId: req.organizationId
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    plan.isActive = false;
    await plan.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'plan.deleted',
      entityType: 'Plan',
      entityId: plan._id
    });

    res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const togglePlanStatus = async (req, res) => {
  try {
    const plan = await Plan.findOne({
      _id: req.params.planId,
      organizationId: req.organizationId
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

