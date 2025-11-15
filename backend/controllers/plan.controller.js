import Plan from '../models/Plan.js';
import Service from '../models/Service.js';
import AuditLog from '../models/AuditLog.js';

export const createPlan = async (req, res) => {
  try {
    if (!req.body.serviceId) {
      return res.status(400).json({ success: false, message: 'serviceId is required' });
    }

    const service = await Service.findOne({
      _id: req.body.serviceId,
      organizationId: req.organizationId
    });

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const planData = {
      ...req.body,
      organizationId: req.organizationId,
      serviceId: service._id,
      serviceName: service.name,
      serviceType: service.category,
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
      .populate('serviceId', 'name category accentColor icon')
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
    }).populate('serviceId', 'name category accentColor icon');

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

    const updates = { ...req.body };

    if (updates.serviceId && updates.serviceId !== plan.serviceId?.toString()) {
      const service = await Service.findOne({
        _id: updates.serviceId,
        organizationId: req.organizationId
      });

      if (!service) {
        return res.status(404).json({ success: false, message: 'Service not found' });
      }

      plan.serviceId = service._id;
      plan.serviceName = service.name;
      plan.serviceType = service.category;
      delete updates.serviceId;
    }

    Object.assign(plan, updates);
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

